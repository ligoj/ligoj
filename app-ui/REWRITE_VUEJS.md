# Introduction

The Spring Boot Application is in @Ligoj/app-api.
The goal is to rewrite the UI in VueJS.

# Current design

- Bootstrap CSS + JS
- jQuery
- DataTables.net CSS + JS
- Font Awesome icons
- Select2
- jQuery.sparkline.js
- Handlebars.js
- require.js
- "cascade.js", a custom MVVM library
- "error.mod.js", a custom error manager
- "application.mod.js", a custom application manager
- "security.mod.js", a custom security manager

The application is plugin aware, so with dynamical ressources.

## `cascade.js` focus

This library located in `cascade.js` file hanles:
- Convention over configuration routing and injection
- i18n along with handlebars
- Inherited contexts from parent hierarchy
- AMD modules loading with require.js
- Transaction management to prevent UI update of a destroyed context
- Auto change title from i18n configuration of current module

Basic behavior:
- User requests URL `/plugin_name`
- Cascade loads the Cascade module `main` (shared common module with utilities, etc.), then `plugin_name`
- Loading a Cascade module `plugin_name` :
  - Get the ressources :
    - `plugin_name/plugin_name.html` (the view, contains handlebars templates)
    - `plugin_name/plugin_name.js` (the controller)
    - `plugin_name/plugin_name.css` (the styles)
    - `plugin_name/nls/messages.js` (always loaded)
    - `plugin_name/nls/fr/messages.js` (depends on current locale)
  - Initialize the context
  - Merge view, the locale files, and the context
  - Inject the styles
  - Inject the merged view in the DOM of the current parent
  - Inject the controller script in the DOM of the current parent
  - Execute the `initialize` function if present of this module

The assets of `plugin_name` are not parts of the main application, but are brought by plugins. Each plugin is scoped to a specific path, and contains its own assets : css, js, html, etc.
Each plugin is in its own GitHub repository. See `plugin-id/src/main/resources/META-INF/resources/id` in this workspace for sample.

The plugins are not parts of the main application, they are made available by another Spring Boot application that add to the classpath the ressources. That's why the `plugin_name` is important to scope the module assets.

For the unload of a module, the `unload` function is called if present of this module and the DOM is cleaned.

## `error.mod.js` focus

This script handles all errors and exceptions. It display the correct message in the UI and log the error in the console.

## `security.mod.js` focus

This script is a guard and a DOM protection layer. It checks the security of the current user and prevents access to restricted resources.

# Target design

- VueJS
- Vite
- Pinia
- VeeValidate
- Vuetify
- VeeValidateI18n
- ...

Migrate the current implementation :
- Common module with utilities, routing, main VueJS app etc. in `app-ui/src/main/webapp`
- Migrated modular plugin `plugin-id` in `plugin-id/src/main/resources/META-INF/resources/id`.
- A plugin is singleton, it can be loaded multiple times but only one instance is kept.
- Do not delete or update the current implementation
- Use `v-index.html` as main entry point for the new VueJS app
- Use `v-login.html` as main entry point for the new VueJS login
- Find a way to minimize the code size of the login part. There is no need to load the full application for the login.
- Do not use Axios library, only native fetch API
- Complete Dockerfile to include the npm command for the VueJS application.
- Document the new implementation for plugins :
  - how to migrate them and how to load/add them from the application dynamically by their name or id or path. 
  - Use `plugin-id` as sample to add it in the app.
  - By contract make all plugins exposing 1 sample function that can be called from the application and other plugins.