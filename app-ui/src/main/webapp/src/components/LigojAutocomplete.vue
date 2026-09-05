<script setup>
/**
 * LigojAutocomplete — a drop-in <v-autocomplete> that suppresses the browser's
 * native autofill / saved-value dropdown, which otherwise renders ON TOP of
 * Vuetify's own suggestion menu.
 *
 * Use it exactly like <v-autocomplete> — every prop, event, slot and `v-model`
 * is forwarded transparently. It defeats autofill three ways, all targeting
 * the real <input> element:
 *   1. `autocomplete="off"` (override via the `autocomplete` prop on the rare
 *      field that genuinely wants native completion);
 *   2. a per-instance, non-guessable `name` so the browser has nothing saved to
 *      match — this also defeats the field-history dropdown in the engines that
 *      ignore `autocomplete="off"` (Chrome). A caller-supplied `name` wins;
 *   3. the password-manager opt-out attributes (1Password / LastPass /
 *      Dashlane) so their overlays don't cover the menu either.
 *
 * The attributes are applied both declaratively (forwarded to the input by
 * Vuetify) and imperatively on mount, so they land on the <input> regardless of
 * Vuetify's attribute-splitting internals.
 */
import { computed, ref, onMounted, useAttrs } from 'vue'
import { uniqueFieldName } from '@/composables/antiAutofill.js'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  // Token placed on the inner <input>. 'off' disables browser autofill.
  autocomplete: { type: String, default: 'off' },
})

const attrs = useAttrs()
const root = ref(null)
// Respect an explicit name; otherwise one unique per instance and per page load
// (see composables/antiAutofill.js: browsers key their form history on it).
const fieldName = String(attrs.name ?? uniqueFieldName('lj-ac'))
// Chrome ignores `autocomplete="off"` for heuristic field types (organization,
// address, mail...) and, since ~2025, IGNORES unknown tokens too (falling back
// to label/name heuristics). `new-password` is a KNOWN token it honors and
// that never has stored values for a text input — the reliable industry
// escape hatch to fully suppress the native autofill dropdown.
const autocompleteToken = computed(() => (props.autocomplete === 'off' ? 'new-password' : props.autocomplete))
// Honor the profile's reduce-motion flag: no dropdown transition. Read from
// the same <html data-reduce-motion> attribute the CSS layer keys on.
const menuProps = computed(() => {
  const caller = attrs['menu-props'] ?? attrs.menuProps ?? {}
  const reduce = typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true'
  return reduce ? { ...caller, transition: false } : caller
})

function hardenInputs() {
  const el = root.value?.$el
  if (!el || typeof el.querySelectorAll !== 'function') return
  el.querySelectorAll('input').forEach((input) => {
    input.setAttribute('autocomplete', autocompleteToken.value)
    if (!input.getAttribute('name')) input.setAttribute('name', fieldName)
    input.setAttribute('data-1p-ignore', 'true')
    input.setAttribute('data-lpignore', 'true')
    input.setAttribute('data-form-type', 'other')
    input.setAttribute('data-bwignore', 'true')
  })
}

onMounted(hardenInputs)

defineExpose({ root })
</script>

<template>
  <v-autocomplete ref="root" v-bind="$attrs" :autocomplete="autocompleteToken" :name="fieldName" :menu-props="menuProps">
    <!-- Forward every slot the caller declares to the inner component. -->
    <template v-for="(_, slot) in $slots" #[slot]="slotProps">
      <slot :name="slot" v-bind="slotProps ?? {}" />
    </template>
  </v-autocomplete>
</template>
