# Changelog

What changed for the people who use and administer Ligoj, across the host and the service-level plugins. Dependency updates, tooling and internal refactoring are left out on purpose. [Version française](CHANGELOG.fr.md)

Scope badges: 🌐 **All** · 🏠 **Core** (login, profile, navigation, API, deployment) · 🖥️ **UI** (dashboard, projects, subscriptions, administration screens) · 👤 **Identity** · ☁️ **Provisioning** · 🗺️ **Cartography** · 📥 **Inbox** · 🔑 **Password** · 💻 **VM** · 🐛 **Bug tracking** · 🏗️ **Build** · 📚 **Knowledge** · ✉️ **Mail** · 🔍 **Quality** · 📦 **Registry** · 📋 **Requirements** · 🌿 **SCM** · 🛡️ **Security** · 💾 **Storage**

## 5.0.0 — unreleased

Changes since Ligoj 4.1.0 (2026-08-05), including the plugin versions published since then and the plugin work that had not reached a release yet.

### ⚠️ Before you upgrade

- 🌐 **All** · Ligoj 5.0 runs on **Java 25** and on plugin-api 5.0. Plugins built for Ligoj 4.x are not supported on 5.0: install the 5.0-compatible release of every plugin listed below.
- 🏠 **Core** · **PostgreSQL is the only database driver bundled by default.** MySQL and MariaDB support must be enabled explicitly when building the API image, with the `db-mysql` or `db-mariadb` Maven profile.
- 🏠 **Core** · **Multi-factor authentication is active by default** (`security.mfa.enabled=true`): a user who registered a device must confirm a code after a form or single sign-on login. API keys and trusted-header logins are not affected. Set `ligoj.mfa.rp-id` to the site host name before users register passkeys, and on an existing database add the `USER` authorization for `^rest/system/mfa.*` by hand: the seed only applies to new databases.
- 🏠 **Core** · The web application's base path must match the API context path. It is fixed at build time with `VITE_BASE` (default `/ligoj/`); the Docker image keeps substituting `CONTEXT_URL` at start-up, which may now be empty for a root deployment. When the context changes, update the redirect URI registered in your identity provider.
- ☁️ **Provisioning** · **Catalog imports run in a single transaction** with batched inserts. On PostgreSQL, keep `idle_in_transaction_session_timeout` at `0` (or generous) and add `reWriteBatchedInserts=true` to the JDBC URL, as described in the plugin README.
- 💻 **VM** · The immediate power operations (power on, power off, stop, restart, reset, suspend) that the subscription row used to offer are not in the new interface yet; operations run from the schedules of the VM configuration page.
- 📋 **Requirements** · The requirements plugin has no screens in the new interface yet; its legacy screens cannot be loaded by Ligoj 5.0.

Compatible plugin releases (pending ones ship with 5.0.0):

| Plugin | Version | Plugin | Version |
|---|---|---|---|
| 🖥️ plugin-ui | 5.0.2 | 📚 plugin-km | 2.0.0 (pending) |
| 👤 plugin-id | 5.0.2 | ✉️ plugin-mail | 2.0.1 (pending) |
| ☁️ plugin-prov | 5.0.1 (pending) | 🔑 plugin-password | 2.0.2 (pending) |
| 🏗️ plugin-build | 5.0.1 | 📦 plugin-registry | 1.0.1 (pending) |
| 🔍 plugin-qa | 5.0.1 (pending) | 📋 plugin-req | 2.0.0 (pending) |
| 🐛 plugin-bt | 2.0.0 (pending) | 🌿 plugin-scm | 2.0.1 (pending) |
| 🗺️ plugin-cartography | 5.0.0 (pending) | 🛡️ plugin-security | 2.0.0 (pending) |
| 📥 plugin-inbox-sql | 5.0.0 (pending) | 💾 plugin-storage | 2.0.0 (pending) |
| 🏠 plugin-iam-node | 5.0.0 (pending) | 💻 plugin-vm | 3.0.0 (pending) |
| 🏠 plugin-redirect | 2.0.0 (pending) | 🏠 plugin-sso-salt | 2.0.0 (pending) |

### ✨ New

- 🌐 **All** · **Rebuilt interface for the remaining services.** Provisioning (quotes, catalog, currency and Terraform pages), bug tracking, cartography, knowledge, security, storage and VM now use the interface introduced for the core in 4.x; their legacy screens are removed.
- 🏠 **Core** · **Second factor at login**: register a passkey or an authenticator app (time-based code) from the Authentication card of your profile, pick a default device or remove one. The code is asked after form and single sign-on logins. The profile also names the identity provider in charge of your account and your last authentication.
- 🏠 **Core** 🖥️ **UI** · **Check API access** from your profile and from the user and role pages: enter a path and a method to see whether it is allowed, with a shortcut opening the API explorer on it.
- 🖥️ **UI** 🏠 **Core** · **Federated roles**: the system users page shows the roles granted through identity-provider groups, with the granting group, and the access check includes them.
- 🖥️ **UI** 🏠 **Core** · **Scheduled tasks** tab on the Tasks page: every scheduled job with its trigger, next and last execution and outcome, next to the long-running task runners.
- 🖥️ **UI** · **Search inside a tool group** on the project page to filter its subscriptions.
- 🖥️ **UI** · **Data models** section in the API explorer, listing the types used by the operations; the API documentation now renders Markdown.
- 👤 **Identity** 🏠 **Core** · **Configurable user display**: `service:id:user-display` accepts any user attribute or an expression such as `${firstName} ${lastName}`, and `service:id:visual-id-name` / `service:id:visual-id-label` choose the attribute shown, sorted and labelled as the user identifier in the user and group-member tables and in dialog titles.
- 👤 **Identity** · **Custom attributes** declared by the primary identity provider are editable in the user dialog, one field per attribute; clearing a field removes the attribute.
- 👤 **Identity** · **"Create another"** toggle on the user, company, group and delegation creation dialogs.
- ☁️ **Provisioning** · **Compare providers**: keep other provisioning subscriptions as synchronized clones of a quote, see the price difference per resource and a summary of the total and of the resources the other catalog cannot match, and re-sync at any time.
- ☁️ **Provisioning** · **Quote snapshots**: capture named versions of a quote, compare any snapshot with the current quote and restore one, with prices re-resolved against the current catalog.
- ☁️ **Provisioning** · **Saved views**: save and restore the search, filters, columns, sort and period of the quote screen, personal or shared with every user of the subscription.
- ☁️ **Provisioning** · **Global search and advanced filters** across every resource type (field and tag criteria, regular expressions, cost and CO₂ comparisons, AND/OR); tab counters and the total cost follow the active filter.
- ☁️ **Provisioning** · **Bulk edit** of the selected resources in one operation, with "Keep" and "Clear" per field; prices are re-resolved.
- ☁️ **Provisioning** · **Cost allocation by tag**, with an "Untagged" bucket; the cost breakdown can also be grouped by tag.
- ☁️ **Provisioning** · **Monthly cost and CO₂ projection** chart on the quote header, and a **cost / carbon switch** with efficiency and carbon-efficiency statistics.
- ☁️ **Provisioning** · **Usage, budget and optimizer profiles** are created and edited from the quote and resource dialogs; resources show what they inherit, and the tables gain Term, Usage and Optimizer columns.
- ☁️ **Provisioning** · **Workload profile editor** (baseline CPU plus periods at a given CPU) replacing the free-text syntax.
- ☁️ **Provisioning** · **Network links**: from the row menu of an instance, database, container or function, define its inbound and outbound links to other resources (peer, port, frequency, throughput); rows show their link count.
- ☁️ **Provisioning** · **IBM Db2** support; database engines now come from the provider catalog, and engines priced with a license only show the license selector next to the engine.
- 🗺️ **Cartography** · **Network map** of a quote, opened fullscreen from the quote page tools: resources and network links as a force-directed graph you can group (application, environment…), size (CPU, RAM, cost, storage) and colour (OS, engine, location, tag…), with icons, animated flows, combinable filter sets with negated conditions, a table view and a JSON export of the full or filtered map.
- 🏠 **Core** · Middle-click on a navigation menu opens it in a new tab.

### 🔄 Improved

- 🏠 **Core** · Profile page: the Authentication card comes first, and the UI and API permission lists are tabs with counts.
- 🏠 **Core** · Dialogs honor the "reduced motion" preference; the default themes give a ripple feedback on click.
- 🏠 **Core** · Plugins without their own screens get no empty navigation entry; a disabled or missing plugin icon is shown gracefully.
- 🖥️ **UI** · "API tokens" are now called **API keys** everywhere.
- 🖥️ **UI** · Parameter descriptions are shown as hints when editing a node or subscribing to a tool.
- 🖥️ **UI** 👤 **Identity** · Dialog titles show the identifier of the project, user, group, company or delegation as a badge; the project list search sits with the table actions.
- 👤 **Identity** · The CSV import sits with the table tools, next to export and copy; the Identity menu hides the entries you are not allowed to open.
- ☁️ **Provisioning** · Redesigned quote header, cost card, tabs and tables with a theme-aware breakdown chart, capacity bars on the resources, rating, OS and database engine icons, and locations shown with flag, country and continent, sorted by name.
- ☁️ **Provisioning** · Software, license, processor, architecture and tag inputs are autocompletes fed by the catalog; "Create another" keeps every value of the previous resource and increments the name suffix.
- ☁️ **Provisioning** · Compact units everywhere (k$, TB, t CO₂), including the subscription cards of the home and project pages, which also show the preferred location with its flag.
- ☁️ **Provisioning** · Explanatory tooltips on every quote action; "Delete all" and the column selector sit in the table header tools; the administration menu groups Catalog, Currency and Terraform under Provisioning.

### 🐞 Fixed

- 🌐 **All** · Browsers no longer autofill saved logins, e-mails or addresses into unrelated text fields, text areas, selects and comboboxes.
- 🏠 **Core** · The session was requested twice at start-up.
- 🏠 **Core** · The UI and API authorization blocks of the profile's Permission card were not filled evenly.
- 🏠 **Core** · Parameter documentation was missing in the API explorer after a Javadoc parsing regression.
- 🏠 **Core** · The default servlet is registered again in the web application (static files were not served in some deployments).
- 🖥️ **UI** · The project list action header was not the built-in one.
- 👤 **Identity** · The company field of the new-user dialog looked already filled (clear button shown, placeholder hidden) while empty.
- 👤 **Identity** · The Groups dropdown opened by itself when the user dialog opened; focus now lands on the first field, and closing a modified dialog honors the "skip leave confirmation" profile preference.
- 👤 **Identity** · Searching a user to add to a group ignored the typed text and always listed the first users.
- ☁️ **Provisioning** · The catalog configuration dialog listed no default location and had no Save or Cancel button.
- ☁️ **Provisioning** · A lookup with no matching price shows the "not found" message instead of failing silently; "Refresh prices" without any change is an informational notice, not an error.
- ☁️ **Provisioning** · New engines, types and terms are visible right after a catalog import instead of after a restart.
- 💻 **VM** · Taking or deleting a snapshot answers at once with the running task instead of holding the request open until the snapshot completes, which could end in a gateway timeout.

### 🔧 Administration

- 🏠 **Core** · **Kubernetes**: a Helm chart (`charts/ligoj`) deploys the API, the web application, the database and the ingress.
- 🏠 **Core** · The primary identity provider setting (`feature:iam:node:primary`) is exposed to the web application, so profiles can name it.
- 🏠 **Core** · Faster start-up: JPA repositories are initialized lazily by default.
- 🖥️ **UI** · **Plugin management**: enable or disable a plugin, see the ones waiting for a restart and plugin statistics; **automation** schedules update checks, automatic updates and maintenance windows, with an updates indicator in the application bar.
- 🖥️ **UI** · **Demo mode**, toggled from the profile: adds demonstration tool groups and projects, a save preview showing what a form would send, a "Demo" chip in the application bar and a showcase page of the shared components.
- 🖥️ **UI** · Flush all caches at once from the cache administration page, with confirmation.
- ☁️ **Provisioning** · **Per-provider configuration** ("Configure…" on the catalog page): the default location of new quotes and regular expressions restricting the imported regions, instance types, operating systems, database types and engines. It replaces the per-location "preferred" flag.
- ☁️ **Provisioning** · The catalog status tooltip shows **import statistics**: current step and progress, who started it and when, duration, last success, and the number of locations, types and prices.
- ☁️ **Provisioning** · A failed catalog import now rolls back and keeps the previous catalog.
