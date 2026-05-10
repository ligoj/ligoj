<script>
/**
 * NodeModeChip — render a node's subscription mode (`all`, `link`,
 * `create`, `none`) as a Vuetify chip with icon + label. Used both for
 * the System → Nodes Mode column and inside the SubscribeWizard's mode
 * radio group.
 */
import { defineComponent, h } from 'vue'
import { VChip, VIcon } from 'vuetify/components'

const MODE_META = {
  all:    { icon: 'mdi-plus-box',     color: 'primary', label: 'All' },
  link:   { icon: 'mdi-link-variant', color: 'info',    label: 'Link' },
  create: { icon: 'mdi-plus',         color: 'success', label: 'Create' },
  none:   { icon: 'mdi-minus-circle-outline', color: 'grey', label: 'None' },
}

export default defineComponent({
  name: 'NodeModeChip',
  props: {
    mode: { type: String, default: 'all' },
    /** Forwarded to v-chip. */
    size: { type: String, default: 'x-small' },
    /** When false, render the icon only (no text). */
    showLabel: { type: Boolean, default: true },
  },
  setup(props) {
    return () => {
      const meta = MODE_META[props.mode] || { icon: 'mdi-help', color: 'grey', label: props.mode || '—' }
      return h(
        VChip,
        { size: props.size, color: meta.color, variant: 'tonal' },
        () => [
          h(VIcon, { start: props.showLabel, size: 'x-small' }, () => meta.icon),
          props.showLabel ? meta.label : null,
        ],
      )
    }
  },
})
</script>
