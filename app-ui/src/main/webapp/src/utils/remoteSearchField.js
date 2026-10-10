/*
 * `parameterField` component of a tool parameter picked among the remote items
 * of the selected instance: binds the tool's search options to
 * LjRemoteSearchField, which receives the props the subscribe wizard passes to
 * every custom field (modelValue, parameter, formValues, instanceNodeId...).
 *
 *   const SpaceField = remoteSearchField({ path: 'rest/service/km/confluence' })
 *   parameterField: ({ parameter, isNode }) => !isNode && parameter?.id === PARAM_SPACE ? SpaceField : null
 *
 * Create the component once, at module level: the wizard resolves the field on
 * each render, and a new component each time would remount the input.
 */
import { defineComponent, h } from 'vue'
import LjRemoteSearchField from '@/components/LjRemoteSearchField.vue'

export function remoteSearchField(options) {
  return defineComponent({
    name: 'RemoteSearchField',
    inheritAttrs: false,
    setup(_, { attrs }) {
      return () => h(LjRemoteSearchField, { ...attrs, ...options })
    },
  })
}
