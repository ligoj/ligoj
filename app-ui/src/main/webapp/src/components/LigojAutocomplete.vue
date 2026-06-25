<script>
// Module-scoped counter → a unique field name per instance for the whole app
// lifetime. (Vue's useId resets its sequence per app instance, which collides
// across separate mounts; a module counter never does.)
let seq = 0
</script>

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
import { ref, onMounted, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  // Token placed on the inner <input>. 'off' disables browser autofill.
  autocomplete: { type: String, default: 'off' },
})

const attrs = useAttrs()
const root = ref(null)
// Respect an explicit name; otherwise a unique, non-guessable one.
const fieldName = String(attrs.name ?? `lj-ac-${++seq}`)

function hardenInputs() {
  const el = root.value?.$el
  if (!el || typeof el.querySelectorAll !== 'function') return
  el.querySelectorAll('input').forEach((input) => {
    input.setAttribute('autocomplete', props.autocomplete)
    if (!input.getAttribute('name')) input.setAttribute('name', fieldName)
    input.setAttribute('data-1p-ignore', 'true')
    input.setAttribute('data-lpignore', 'true')
    input.setAttribute('data-form-type', 'other')
  })
}

onMounted(hardenInputs)

defineExpose({ root })
</script>

<template>
  <v-autocomplete ref="root" v-bind="$attrs" :autocomplete="autocomplete" :name="fieldName">
    <!-- Forward every slot the caller declares to the inner component. -->
    <template v-for="(_, slot) in $slots" #[slot]="slotProps">
      <slot :name="slot" v-bind="slotProps ?? {}" />
    </template>
  </v-autocomplete>
</template>
