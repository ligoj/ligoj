import { computed } from 'vue'
import registry from '@/plugins/registry.js'

/**
 * Generic plugin extension point for the entity create/edit dialogs (project,
 * user, delegate, container-scope, company, group, ...).
 *
 * Any registered plugin may expose an `editExtension` feature. It is invoked
 * with the edition context `{ target, mode, ...dialogContext }` — `target`
 * identifies the extended dialog (e.g. 'project', 'user'), `mode` is
 * 'create' or 'edit' — and returns a contribution object (or null/undefined
 * to opt out for this target):
 *
 *   editExtension(ctx) {
 *     if (ctx.target !== 'project') return null
 *     return {
 *       // Optional Vue component rendered below the dialog's built-in form,
 *       // before the actions. Mounted with { mode, form, context } props —
 *       // `form` is the dialog's live model: extra keys the component writes
 *       // into it are sent in the save payload.
 *       component: MyExtension,
 *       // Optional Vue component mounted in the dialog's action bar (footer),
 *       // next to the built-in buttons — typically an LjButton. Same
 *       // { mode, form, context } props.
 *       footer: MyExtensionAction,
 *       // Optional replacement REST resource for the save POST/PUT (same API
 *       // base, different resource). First contributing plugin wins.
 *       apiPath: 'rest/my-project',
 *     }
 *   }
 *
 * `registry.version` is read for reactivity so a plugin loaded lazily after
 * the dialog mounted still contributes.
 *
 * @param {string} target Dialog identifier passed to contributors.
 * @param {string} defaultApiPath REST resource used when no plugin replaces it.
 * @param {() => object} contextSupplier Dialog context ({ mode, ...entity refs }).
 * @return {{components: import('vue').ComputedRef, apiPath: import('vue').ComputedRef,
 *          context: import('vue').ComputedRef}}
 */
export function useEditExtensions(target, defaultApiPath, contextSupplier) {
  const context = computed(() => ({ target, ...contextSupplier() }))

  const extensions = computed(() => {
    void registry.version.value
    const ctx = context.value
    const out = []
    for (const plugin of registry.list()) {
      if (typeof plugin?.feature !== 'function') continue
      let ext
      try {
        ext = plugin.feature('editExtension', ctx)
      } catch (err) {
        // Optional feature: swallow the standard "no feature" rejection only
        if (!/no feature ["']editExtension["']/.test(err?.message || '')) {
          console.warn(`[edit-extension] ${plugin.id}.editExtension threw`, err)
        }
        continue
      }
      if (ext) out.push(ext)
    }
    return out
  })

  const components = computed(() => extensions.value.filter((e) => e.component).map((e) => e.component))
  const footers = computed(() => extensions.value.filter((e) => e.footer).map((e) => e.footer))
  const apiPath = computed(() => extensions.value.map((e) => e.apiPath).find(Boolean) || defaultApiPath)
  return { components, footers, apiPath, context }
}
