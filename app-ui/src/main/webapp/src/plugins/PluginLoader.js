import { defineAsyncComponent } from 'vue'

const PluginLoader = {
    plugins: new Map(),

    /**
     * Register a plugin.
     * @param {string} id - Unique identifier for the plugin
     * @param {string} path - Path to the plugin entry point (relative to base or absolute URL if external)
     */
    register(id, path) {
        if (this.plugins.has(id)) {
            console.warn(`Plugin ${id} is already registered.`)
            return
        }
        this.plugins.set(id, { path, instance: null })
    },

    /**
     * Register a plugin by URL.
     * @param {string} id - Unique identifier for the plugin
     * @param {string} url - URL to the plugin entry point
     */
    registerUrl(id, url) {
        this.register(id, url)
    },


    /**
     * Load a plugin asynchronously.
     * @param {string} id - Plugin identifier
     * @returns {Promise<any>} - The plugin module or component
     */
    async load(id) {
        const plugin = this.plugins.get(id)
        if (!plugin) {
            throw new Error(`Plugin ${id} not found.`)
        }

        // Singleton pattern: return existing instance if available
        // Note: for Vue components, "instance" might conceptually be the definition 
        // but here we are loading the module.
        if (plugin.instance) {
            return plugin.instance
        }

        try {
            // Dynamic import. Note: Vite/Rollup requires specific handling for dynamic strings.
            // We assume paths are resolvable. For external plugins, we might need a different strategy 
            // (e.g. creating a script tag or using a system loader).
            // For local migration:
            const module = await import(/* @vite-ignore */ plugin.path)
            plugin.instance = module.default || module
            return plugin.instance
        } catch (error) {
            console.error(`Failed to load plugin ${id}:`, error)
            throw error
        }
    },

    /**
     * Get a Vue component definition for the plugin.
     * @param {string} id - Plugin identifier
     * @returns {Component} - Async component definition
     */
    getComponent(id) {
        return defineAsyncComponent(() => this.load(id))
    }
}

export default PluginLoader
