// Import-map shim (dev). Runtime-loaded plugin bundles import `@ligoj/host`
// as a bare specifier (it's externalised in their Vite build). The dev
// import-map (see vite.config.js) points that specifier here so the plugin
// shares the SAME host module instance as the 2026 app — same registry,
// pinia stores and i18n store — which is what makes install()/feature()
// contributions visible to our views.
export * from '@ligoj/host'
