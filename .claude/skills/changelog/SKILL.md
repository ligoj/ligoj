---
name: changelog
description: Use when a Ligoj release starts, before tagging or publishing a GitHub release, or whenever release notes / a functional changelog for users and administrators is requested across the host, ligoj-api and the service-level plugins (plugin-ui, plugin-id, plugin-prov, plugin-bt...).
---

# Release changelog for users and administrators

## Overview

Commit types do not separate functional changes from technical ones in Ligoj history: `feat(pom)`, `feat(vite)` and `feat(doc)` are internal, while a `fix(java)` on a pom can be an upgrade-breaking default. Classify every commit by **its effect on a user or an administrator**, merge commits into features, and write each entry in their words with a scope badge.

## Scope and window

- Repos: this host, `../ligoj-api`, and the service-level plugins under `../ligoj-plugins` (`plugin-<svc>`, plus `plugin-<a>-<b>` when no `plugin-<a>` parent exists). Tool-level plugins (`plugin-id-ldap`, `plugin-prov-aws`, `plugin-bt-jira`...) get no entry; `scan.sh` lists their subjects in `tool-hints.md` only to decide whether an extension point has a visible consumer.
- Window per repo: from **the tag that was current at the previous host release** (latest tag not newer than the host tag) to HEAD. Plugins release on their own cadence: a plugin tagged after the host release carries work committed before it, and a plugin not tagged for years carries everything since. `scan.sh` applies this rule and skips merge commits; a branch merged after the base tag is in the window even when its commits are older. A release made without a tag is invisible to the rule: when a repo looks odd, compare its `Unreleased` count with its "release X" commits.
- Uncommitted work never enters the changelog. `inventory.md` lists dirty repos: name them in the report.

## Steps

1. Run `bash .claude/skills/changelog/scan.sh --out <scratchpad>/changelog` (`--since-tag vX.Y.Z` overrides the previous host tag). Read `inventory.md`, then `candidates.md` (one heading per distinct subject with every repo and commit carrying it), `auto-excluded.md`, and `tool-hints.md` when an extension point is in doubt.
2. Pull back false drops from `auto-excluded.md`: a pom-only default change, a doc-only rename of a visible option, a rewrite hidden behind a "bump" subject. They are marked `(pom-only)` or `(main-code)`, or come from a `.md` file.
3. Give every candidate commit a verdict, USER, ADMIN or DROP, with the table below. A heading is a merge hint, not a feature: it can gather unrelated changes sharing a subject, and one commit can carry two changes. When the subject is not enough, read the block in `commits/<repo>.txt` (body and files) or run `git -C <repo> show <hash>`; a subject can even contradict the diff ("sort by name" when the change was rendering). Always read the Java diff of a migration or rewrite commit: it can carry an unrelated fix (a snapshot call that no longer blocks until completion).
4. Merge before writing: one entry per feature whatever the number of commits, subjects or repos (host and plugin-ui often carry the same feature; "vuejs migration" in every plugin is one entry). A change superseded or reverted inside the window disappears. The Java requirement is the major of the host parent version printed at the top of `inventory.md`; the plugin-api requirement comes from the host pom; both are stated once, never from the bump commits.
5. Write the section at the top of `CHANGELOG.md` in the format below, with `— unreleased` in the heading until the tag exists. When an `— unreleased` section already exists, reconcile it entry by entry: keep the wording that is still accurate, correct wrong facts, add what is missing, remove what was superseded; never add a second section. Keep the badge legend at the top of the file in sync with the scopes used. Then write the same section in `CHANGELOG.fr.md`, entry for entry in the same order with the same badges (French labels below), using the product vocabulary of the `fr.js` i18n files: souscription, entité, devis, catalogue, clés API, passkey, instantané for a quote snapshot, sauvegarde for a VM snapshot, carte réseau.
6. Report in the final message: entry count per section, the DROP verdicts that were judgment calls, the dirty repos, the repos with `Unreleased` commits in `inventory.md` (their release is pending and the compatible-plugins table must say so), and any side observation (a plugin pom still pinning an old dependency range).
7. At tag time: replace `unreleased` / `non publiée` by the date in both files, refresh the compatible-plugins table from `versions.md`, then `gh release create vX.Y.Z --title X.Y.Z --notes-file <the section, extracted to a temp file>`.

## Classification

| Verdict | Signals |
|---|---|
| USER | New or changed screen, dialog, menu, wording or translation; changed behaviour of an existing feature; a fix a user could have noticed |
| ADMIN | Configuration property or default, authorization seed, Docker, Helm or compose, database driver, Java or plugin-api requirement, start-up behaviour, plugin management, CLI, a manual step |
| DROP | Dependencies, lint, release plumbing, tests, CI, dev tooling (Vite, Jetty dev root, launch files), internal components, composables and extension points with no visible change, code-base docs, codenames, a relocation of an existing feature between repos (host stub moved into its plugin, a field moved from a tool plugin to its parent) |

Section rules:
- What a user sees goes to `New`, `Improved` or `Fixed` even when a setting drives it (name the setting in the entry). `Before you upgrade` and `Administration` hold what only administrators see or must do.
- `Fixed` is for a nuisance or a wrong behaviour a user could have noticed; everything else visible is `Improved` or `New`.
- An extension point (`renderFeatures`, row-action, page-header, edit-extension or parameter-field hooks) is DROP unless `tool-hints.md` or a service plugin shows a visible consumer in the same window; the consumer's entry then carries it.
- A rewritten plugin gets one entry for the rewrite plus entries for what the current implementation adds; legacy-era work of the old implementation is DROP. A capability the rewrite does not offer yet (an action the old screen had) goes to `Before you upgrade`.
- A `(pom-only)` commit under a feature heading means the feature itself is outside the window for that repo: it does not count that repo among the rewritten or changed ones.
- The `LigojTextField`, `LigojTextarea`, `LigojSelect`, `LigojCombobox` and `LigojAutocomplete` swaps are the browser-autofill fix: one 🌐 **All** entry in `Fixed`, never a per-plugin one.
- Never carry a customer, project or person name from a subject into an entry.

## Entry format

```
- 🏠 **Core** · Sign in with a passkey or an authenticator app as a second factor, managed from your profile.
- 🖥️ **UI** 👤 **Identity** · One entry, several badges, when a feature spans repos; the repo shipping the screens comes first. A screen contributed into another plugin's page keeps the badge of the plugin that owns it.
- 🌐 **All** · Cross-cutting change.
```

Sections in this order, each omitted when empty: `⚠️ Before you upgrade` (ADMIN, breaking or manual step), `✨ New`, `🔄 Improved`, `🐞 Fixed`, `🔧 Administration` (ADMIN, non-breaking). Inside a section: All, Core, UI, then the plugins in the legend order. One sentence per entry, a second one only for a required manual step. Name the screen or the setting, never the class, component, file or endpoint: `security.mfa.enabled` is fine, `MfaVerifyFilter` is not. Bold the two or three words a reader scans for.

| Badge | Repo | Badge | Repo |
|---|---|---|---|
| 🌐 **All** | cross-cutting | 🐛 **Bug tracking** | plugin-bt |
| 🏠 **Core** | ligoj, ligoj-api | 🏗️ **Build** | plugin-build |
| 🖥️ **UI** | plugin-ui | 📚 **Knowledge** | plugin-km |
| 👤 **Identity** | plugin-id | ✉️ **Mail** | plugin-mail |
| ☁️ **Provisioning** | plugin-prov | 🔍 **Quality** | plugin-qa |
| 🗺️ **Cartography** | plugin-cartography | 📦 **Registry** | plugin-registry |
| 📥 **Inbox** | plugin-inbox-sql | 📋 **Requirements** | plugin-req |
| 🔑 **Password** | plugin-password | 🌿 **SCM** | plugin-scm |
| 💻 **VM** | plugin-vm | 🛡️ **Security** | plugin-security |
| | | 💾 **Storage** | plugin-storage |

French labels: Tous, Cœur, Interface, Identité, Provisionnement, Cartographie, Boîte de réception, Mot de passe, VM, Suivi des anomalies, Build, Connaissance, Courriel, Qualité, Registre, Exigences, SCM, Sécurité, Stockage. Sections: Avant de mettre à jour, Nouveautés, Améliorations, Corrections, Administration; `— non publiée`, `(en attente)`.

## Common mistakes

| Mistake | Fix |
|---|---|
| Filtering on `feat` and `fix` types | Half of the `feat` commits are internal: classify by effect |
| Host repo only | plugin-ui carries most screens, the plugins carry the services |
| Window = "since the host tag date" | A plugin tagged after the host release ships older work too: use the base-tag rule (`scan.sh` does) |
| One entry per commit, or one per heading | Merge by feature across commits and repos; verdicts per commit |
| Trusting the subject | Read the diff when the subject is short or generic |
| Listing legacy-era work of a rewritten plugin | Only what the current implementation ships |
| Developer wording | Rewrite for someone who never opened the code |
| Skipping `auto-excluded.md` | The PostgreSQL-only default was a pom-only `fix` |
| "SNAPSHOT means pending release" | Every pom is a SNAPSHOT after a release; use the `Unreleased` column |
