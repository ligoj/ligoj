# SonarQube CREATE mode: permission template per project

**Repository:** `~/git/ligoj-plugins/plugin-qa-sonarqube` (Java resource, CSV seeds, `ui/` bundle).
**Reference:** the `ligoj bootstrap` CLI, `~/git/ligoj-cli/ligojcli/plugins/sonarqube.py` (`sonar_create_template`, `sonar_create_roles`, `sonar_delete_roles`).

## Goal

A subscription in CREATE mode creates a SonarQube permission template for the Ligoj project, granting the project
groups their permissions on every SonarQube project whose key matches the template pattern. The subscription then
finds the projects the template applies to and shows the most recently analyzed one, with the others listed.

## Decisions (approved 2026-10-15)

| Topic | Decision |
|---|---|
| Permissions | Optional JSON role mapping keyed by group, like Nexus and Jenkins. |
| Template name and pattern | Two parameters, prefilled from the Ligoj project key, editable. |
| Display | Latest analyzed project like a LINK subscription, plus a "+N projects" list. |
| Existing projects | Left untouched: the template applies to projects created afterwards, as in the CLI. |
| Unsubscribe with remote data | The template is deleted; groups and projects are kept. |

## 1. Parameters and modes

New parameters, owner `service:qa:sonarqube`, mode `CREATE`, `availableForSubscription` TRUE, `availableForNode`
FALSE, not secured:

| Id | Mandatory | Content |
|---|---|---|
| `service:qa:sonarqube:template` | TRUE | Template name, prefilled with the project key (`demo-1`). |
| `service:qa:sonarqube:template-pattern` | TRUE | Project key pattern, a Java regex, prefilled with `<pkey>:.*`. |
| `service:qa:sonarqube:roles` | FALSE | Role mapping JSON, blank for a template without group permission. |

The existing `service:qa:sonarqube:project` gets mode `LINK`: plugin-core accepts and checks the mandatory parameters
of the subscription mode only (`ParameterRepository#getOrphanParameters`, `SubscriptionResource` mandatory check), so
it stays mandatory in LINK and is not asked in CREATE.

The tool node `service:qa:sonarqube` goes from `LINK` to `ALL` in `node.csv`, so an instance can offer CREATE without
the node dialog's mode conflict warning. Existing instances keep their mode; an administrator switches one to CREATE
or ALL to offer the new mode.

Seeds are insert-only (`parameter.csv` uses CRLF line endings): the new rows are inserted on the plugin update, but the
mode changes of existing rows need `update(String)`, idempotent since it reruns on every IDE restart:

- tool node `service:qa:sonarqube` mode → `ALL`;
- parameter `service:qa:sonarqube:project` mode → `LINK`.

## 2. Role mapping

`{ "<group>": ["<permission>", ...], ... }`. A group is the SonarQube group name, for example the Ligoj group
`demo-1-dev`. A permission is one of the project permissions `user`, `codeviewer`, `issueadmin`,
`securityhotspotadmin`, `scan`, `admin` (the CLI `SONAR_PERMISSIONS_PROJECT`). Rules, checked on the trimmed value:

- blank → no group permission;
- not a JSON object, a blank group name, or a value that is not a non-empty array → `sonar-roles-json`;
- an unknown permission → `sonar-roles-permission` with `group` and `permission`.

The UI mirrors these rules while typing; the backend stays the reference.

## 3. Subscribing (`create(int subscription)`)

Every SonarQube call passes the node organization when set (`organizationFilter`), so the mode works on SonarQube
Cloud too.

1. Read and check the inputs: template name trimmed and not blank (`NotBlank`), pattern compiles with
   `java.util.regex.Pattern` (`sonar-template-pattern` on the pattern), role mapping (section 2).
2. `validateAdminAccess(parameters)`.
3. Find the template: `GET api/permissions/search_templates?q=<name>`, then an exact name match in
   `permissionTemplates`.
   - Missing: `POST api/permissions/create_template` with `name`, `projectKeyPattern`, `description`
     (`Ligoj project <project name>`).
   - Same pattern: reused, warning `sonar-template-reused` (`ResponseWarnings`, shown as a toast).
   - Other pattern: `ValidationJsonException(template-pattern, "sonar-template-exists", "pattern", <existing>)`.
4. For each mapped group:
   - `GET api/user_groups/search?q=<group>`, exact name match; when missing, `POST api/user_groups/create` with `name`,
     like the CLI;
   - each listed permission: `POST api/permissions/add_group_to_template` (`templateName`, `groupName`,
     `permission`);
   - each other project permission: `POST api/permissions/remove_group_from_template`, so the group gets exactly the
     listed permissions, like the CLI `sonar_set_permissions`.
5. A SonarQube refusal of a write (the node user does not administer SonarQube, HTTP 401/403) →
   `ValidationJsonException(user, "sonar-admin")`.

`api/user_groups/*` is deprecated since SonarQube 10.4 and still served by 26.6; it is the API common to 9.9, 26.x and
SonarQube Cloud. Moving to `api/v2/authorizations/groups` is out of scope.

## 4. Finding the projects (`checkSubscriptionStatus`)

A subscription holding the template parameter is template-based; one holding the project parameter works as today.

1. Read the template by name (as in 3.3). Missing → `ValidationJsonException(template, "sonar-template", <name>)`:
   the subscription is DOWN. The pattern is read from the template, the source of truth once created.
2. List the projects: `GET api/projects/search?ps=500&p=<n>` with the organization filter and, when the pattern starts
   with a literal of at least 2 characters (up to the first of `\.[]{}()*+?^$|`), `q=<literal>` to narrow the search
   server side (`q` is a contains match, so this is a superset). Pages are read until the total, at most 20 pages
   (10,000 projects), logged when the cap is reached.
3. Keep the keys matching the pattern (`Pattern#matcher(key).matches()`), sorted by `lastAnalysisDate` descending, the
   never analyzed ones last, then by key.
4. Status data:
   - `template`: `{ name, pattern }`;
   - `project`: the latest analyzed project through the existing `getProject(parameters, key)` (metrics and branches,
     same shape as LINK), absent when none was analyzed;
   - `projects`: the first 20 matching projects `{ key, name, lastAnalysisDate }`, latest first;
   - `projectsCount`: the number of matching projects.

No matching or analyzed project is still UP. `api/projects/search` needs the SonarQube administration right, which the
CREATE mode needs anyway.

## 5. Unsubscribing (`delete(int subscription, boolean deleteRemoteData)`)

Without remote data: nothing. With remote data: the template found by name is deleted
(`POST api/permissions/delete_template`, `templateName`); a template already gone is a warning
`sonar-template-missing`. Groups and projects are kept: SonarQube groups are often shared or synchronized from LDAP,
and projects are created by the scanners. This differs from the CLI, which deletes the groups.

## 6. UI (`ui/src`)

- `parameterLayout` in CREATE mode: template, template-pattern, roles. LINK unchanged.
- `parameterField` in CREATE mode:
  - template and template-pattern: a text field prefilled from `project.pkey` while empty (`pkey`, `<pkey>:.*`), like
    plugin-id-ldap `IdOuField`;
  - roles: a JSON textarea checked while typing (section 2 rules), sample placeholder built from the project key:
    `{ "<pkey>-admin": ["admin", "user"], "<pkey>-dev": ["user", "codeviewer", "scan"] }`.
- Project row, for a template-based subscription:
  - key chip: the template name, its tooltip giving the pattern;
  - dashboard link, metrics and branches: those of `data.project`, as LINK reads them from the project parameter;
  - a "+N projects" chip when other projects match, listing `data.projects` (key, last analysis date, dashboard link)
    and "and M more" past the first 20;
  - no analyzed project yet: a "No analyzed project" hint.
- Status tooltip: `parameterSummary` of the roles, "3 groups: demo-1-admin, demo-1-dev, demo-1-test" (first three
  names, then `+N`), pluralized.
- i18n, English and French: the three parameter labels and descriptions, the error rules
  (`sonar-roles-json`, `sonar-roles-permission`, `sonar-template-pattern`, `sonar-template-exists`, `sonar-template`,
  `sonar-admin`), the warnings (`sonar-template-reused`, `sonar-template-missing`), the row texts and the summary.

## 7. Tests

Java, WireMock as in `SonarQubePluginResourceTest`:

- create: new template with groups created and permissions set; reused template (same pattern, warning); other
  pattern refused; invalid pattern; invalid role mapping (format, permission); blank mapping; write refused
  (`sonar-admin`); Cloud organization passed on every call;
- status: pattern filter with the literal `q`, sort by last analysis, latest project details, none analyzed, template
  missing (DOWN), paging, LINK unchanged;
- delete: without remote data, with, template already gone;
- `update`: node and parameter modes changed, idempotent.

UI (vitest): prefill from the project key, roles validation, layout per mode, row rendering (latest project, "+N"
list, none analyzed, LINK unchanged), roles summary in both languages.

Live:

- the local SonarQube 26.6 container: subscribe a test project in CREATE mode, check the template and its group
  permissions on SonarQube, then unsubscribe with remote data and check the template is gone;
- nothing is created on the SonarQube Cloud organization without an explicit go-ahead.

## Out of scope

- Applying the template to existing projects (`bulk_apply_template`).
- Global permissions and SonarQube projects created by Ligoj (the CLI `roles` and `projects` sections).
- Deleting groups; the v2 groups API.
- Switching the displayed project in the row.
