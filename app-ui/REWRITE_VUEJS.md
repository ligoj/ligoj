# Introduction

The Spring Boot Application is in @ligoj/app-api.
The goal is to rewrite the UI in VueJS.

This is a modular project with many Maven plugins that can be added dynamically.
All plugins are available in this workspace under `ligoj/plugin-<qualified-id>` repositories (github).

At mmost, there is one parent plugin.
Whe a plugin has a parent, the perent is of type `tool`
When a plugin has no parent, it is of type `service` or `feature`.
A plugin of type `feature` cannot have children.


# Github layout
```
ligoj/plugin-<qualified-id> (github)
├── README.md
├── pom.xml
└── src/
    └── main/
        ├── java/
        │   └── org/
        │       └── ligoj/
        │           └── plugin/
        │               └── <PluginClassName>.java
        └── resources/
            └── META-INF/
                └── resources/
                    └── <plugin-path>/
                        ├── <plugin-short-id>.html
                        ├── <plugin-short-id>.js
                        ├── <plugin-short-id>.css
                        ├── messages.js
                        └── nls/
                            ├── en/
                            │   └── messages.js
                            └── fr/
                                └── messages.js
```

Plugins can be children of a group, so nested plugins are possible.
Naming convention for ample of GitHub repository `plugin-prov-aws`
  - `qualified-id` is `prov-aws`.
  - `plugin-short-id` is `aws`.
  - `plugin-path` is `prov/aws`.
  - `plugin-class` is `org.ligoj.app.plugin.prov.aws.resource.ProvAwsPluginResource`, but the simple Java Class name could be without parent plugin prefix, so `AwsPluginResource`.
  - Parent `qualified-id` of `prov-aws` is `prov`. So the Maven repository `plugin-prov-aws` depends on `plugin-prov`.

Each plugin provides at least on `node`:
- the plugin provided nodes have an `id` having the following form: 
  - `service:<plugin-short-id>` for a service
  - `feature:<plugin-short-id>` for a feature
  - `service:<parent-plugin-short-id>:<plugin-short-id>` for a tool `plugin-short-id` having `parent-plugin-short-id` as parent plugin.
- the user can create instances of the tool nodes. So the instances have an `id` having the following form: 
  - `service:<parent-plugin-short-id>:<plugin-short-id>:<instance-id>`.
  - No instance can be created dirrectly under a service or feature node.
  - If the node `id` contains 4 segments, it is an instance node, and the parent `id` contains 3 segments.
  - If the node `id` contains 3 segments, it is a tool node, and the parent `id` contains 2 segments.
  - If the node `id` contains 2 segments, it is a service node or a service. The first segment is always `service` or `feature`.

# Current design

- Bootstrap CSS + JS
- jQuery
- DataTables.net CSS + JS
- Font Awesome icons
- Select2
- jQuery.sparkline.js
- Handlebars.js
- require.js
- `cascade.js`, a custom MVVM library
- `error.mod.js`, a custom error manager
- `application.mod.js`, a custom application manager
- `security.mod.js`, a custom security manager

The application is plugin aware, so with dynamical resources.

## `cascade.js` focus

This library located in `cascade.js` file handles:
- Convention over configuration routing and injection
- i18n along with handlebars
- Inherited contexts from parent hierarchy
- AMD modules loading with require.js
- Transaction management to prevent UI update of a destroyed context
- Auto change title from i18n configuration of current module

Current behavior:
- User requests URL `#/plugin_path`
- Cascade loads the Cascade module `main` (shared common module with utilities, etc.), then `plugin_path`
- Loading a Cascade module `plugin_path` :
  - Get the ressources :
    - `<plugin_path>/<plugin_short_id>.html` (the view, contains handlebars templates)
    - `<plugin_path>/<plugin_short_id>.js` (the controller)
    - `<plugin_path>/<plugin_short_id>.css` (the styles)
    - `<plugin_path>/nls/messages.js` (always loaded)
    - `<plugin_path>/nls/fr/messages.js` (depends on current locale)
  - Initialize the context
  - Merge view, the locale files, and the context
  - Inject the styles
  - Inject the merged view in the DOM of the current parent
  - Inject the controller script in the DOM of the current parent
  - Execute the `initialize` function if present of this module

The assets of `plugin_path` are not parts of the main application, but are brought by plugins. Each plugin is scoped to a specific path, and contains its own assets : css, js, html, etc.
Each plugin is in its own GitHub repository `ligoj/<plugin-repository-id>`. See `<plugin-repo-id>/src/main/resources/META-INF/resources/` in this workspace for sample.

The plugins are not parts of the main application, they are made available by another Spring Boot application that add to the classpath the resources. That's why the `plugin_path` is important to scope the module assets.

For the unload of a module, the `unload` function is called if present of this module and the DOM is cleaned.

## `error.mod.js` focus

This script handles all errors and exceptions. It displays the correct message in the UI and log the error in the console.

## `security.mod.js` focus

This script is a guard and a DOM protection layer. It checks the security of the current user and prevents access to restricted resources.

# Target design

- VueJS
- Vite
- Pinia
- VeeValidate
- Vuetify
- VeeValidateI18n
- Material Design icons and simpleicons.org
- ...


Migrate the current implementation :
- Common module with utilities, routing, main VueJS app etc. in `app-ui/src/main/webapp`
- Migrate modular plugin `plugin-id` in `plugin-id/src/main/resources/META-INF/resources/id`.
- A plugin is singleton, it can be loaded multiple times but only one instance is kept.
- Use `v-index.html` as main entry point for the new VueJS app
- Use `v-login.html` as main entry point for the new VueJS login
- Find a way to minimize the code size of the login part. There is no need to load the full application for the login.
- Do not use Axios library, only native fetch API
- Complete Dockerfile to include the npm command for the VueJS application.
- `v-dialog` should not be persistent by default.
- Document the new implementation for plugins :
  - how to migrate them and how to load/add them from the application dynamically by their name or id or path. 
  - Use `plugin-id` (there `~/git/ligoj-plugins/plugin-id`) as sample to add it in the app.
  - By contract make all plugins exposing 1 function `feature` that can be called from the application and other plugins.
  
The challenge is that each module like `plugin-id` is a standalone Maven project:
- it has its own life cycle
- it can be added, removed by a Java plugin manager discovered and served by a Webjars Servlet (`~/git/bootstrap/bootstrap-plugin/src/main/java/org/ligoj/bootstrap/resource/system/plugin/WebjarsServlet.java`).
- no restart or build is needed to add/remove a plugin from the context
- make it easy to test in local mode in browser. Maybe one Vite configuration per module?

# Core components

Core components are in `~/git/ligoj/app-ui/src/main/webapp/src/components`. They are share with the other plugins modules.
