import { inject, provide, reactive } from 'vue'

const PLUGIN_CONTEXT_KEY = Symbol('pluginContext')

export function providePluginContext(ctx) {
  const context = reactive({
    pluginId: ctx.pluginId || null,
    parentPath: ctx.parentPath || '',
    ...ctx,
  })
  provide(PLUGIN_CONTEXT_KEY, context)
  return context
}

export function usePluginContext() {
  return inject(PLUGIN_CONTEXT_KEY, reactive({ pluginId: null, parentPath: '' }))
}
