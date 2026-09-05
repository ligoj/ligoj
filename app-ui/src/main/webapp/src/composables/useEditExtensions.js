import { computed } from 'vue'
import registry, { collectFeature } from '@/plugins/registry.js'

/**
 * Generic plugin extension point for the entity create/edit dialogs (project,
 * user, delegate, container-scope, company, group, ...).
 *
 * Any registered plugin may expose an `editExtension` feature (targets so
 * far: project, user, delegate, container-scope, company, group, prov-quote).
 * It is invoked
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
 *       // Optional interception of the save payload, right before the
 *       // POST/PUT: complete it (e.g. with data collected by the contributed
 *       // component) or reshape it for a custom API. Receives the payload the
 *       // dialog is about to send and the extension context; returns the
 *       // payload to send (sync or async; returning nothing keeps the input,
 *       // so in-place mutation works too; returning `false` ABORTS the save
 *       // silently — e.g. after a preview the user declined). Hooks of several
 *       // plugins chain in registration order — each one sees the previous result.
 *       beforeSave(payload, ctx) { return { ...payload, extra: 42 } },
 *     }
 *   }
 *
 * `registry.version` is read for reactivity so a plugin loaded lazily after
 * the dialog mounted still contributes.
 *
 * @param {string} target Dialog identifier passed to contributors.
 * @param {string} defaultApiPath REST resource used when no plugin replaces it.
 * @param {() => object} contextSupplier Dialog context ({ mode, ...entity refs }).
 * @return {{components: import('vue').ComputedRef, footers: import('vue').ComputedRef,
 *          apiPath: import('vue').ComputedRef, context: import('vue').ComputedRef,
 *          prepare: (payload: object) => Promise<object | false>}}
 */
export function useEditExtensions(target, defaultApiPath, contextSupplier) {
  const context = computed(() => ({ target, ...contextSupplier() }))

  const extensions = computed(() => {
    // Subscribe to lazy plugin loads; the collector skips non-contributors
    void registry.version.value
    return collectFeature('editExtension', context.value)
  })

  const components = computed(() => extensions.value.filter((e) => e.component).map((e) => e.component))
  const footers = computed(() => extensions.value.filter((e) => e.footer).map((e) => e.footer))
  const apiPath = computed(() => extensions.value.map((e) => e.apiPath).find(Boolean) || defaultApiPath)
  const beforeSaveHooks = computed(() => extensions.value.map((e) => e.beforeSave).filter((f) => typeof f === 'function'))

  /**
   * Run the contributed `beforeSave` hooks over the payload the dialog is about
   * to send, in registration order, and return the payload to send. Without
   * contributor the input is returned untouched.
   *
   * @param {object} payload The payload built by the dialog.
   * @returns {Promise<object | false>} The (possibly completed/reshaped) payload, or `false` when a hook
   *   aborted the save — the dialog then stops silently.
   */
  async function prepare(payload) {
    let current = payload
    for (const hook of beforeSaveHooks.value) {
      const result = await hook(current, context.value)
      if (result === false) return false
      current = result ?? current
    }
    return current
  }

  return { components, footers, apiPath, context, prepare }
}
