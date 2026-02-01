# Plugin Migration and Dynamic Loading

## Migration Guide (JQuery to VueJS)

1.  **Create Vue Component**: Create a `.vue` file for your plugin (e.g., `MyPlugin.vue`) in `src/main/resources/META-INF/resources/myplugin/`.
2.  **Migrate Logic**:
    *   Move controller logic from `.js` to the Vue component's `<script setup>`.
    *   **Refactor Network Calls**: Replace `Axios` or `$.ajax` with native `fetch(REST_PATH + '...')`.
    *   **Singleton Service**: If you have a service file, ensure it exports a singleton object.
3.  **Plugin Configuration**: Create a `plugin-config.json` (optional, for metadata).
4.  **Expose Contract**: Ensure your plugin exposes required functions.

### Sample Function Contract
All plugins must expose a `sampleFunction()` in their service or component to be callable by the host.

```javascript
// my-plugin.service.js
export default {
    sampleFunction() {
        return "I am MyPlugin"
    }
}
```

## Dynamic Plugin Loading

The application uses `PluginLoader.js` to load plugins dynamically.

### Registration
Plugins are registered by ID and Path.
```javascript
import PluginLoader from '@/plugins/PluginLoader'
PluginLoader.register('my-plugin', '/path/to/MyPlugin.vue')

// Or by URL
PluginLoader.registerUrl('remote-plugin', 'https://example.com/plugins/RemotePlugin.js')

```

### Loading
Use `PluginLoader.load('my-plugin')` to get the module, or `PluginLoader.getComponent('my-plugin')` to get a Vue Async Component.

### Singleton Pattern
The loader ensures that once a plugin is loaded, the same instance (module) is returned for subsequent requests.
