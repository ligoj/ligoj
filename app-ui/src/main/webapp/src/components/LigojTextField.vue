<script setup>
/**
 * LigojTextField — a drop-in <v-text-field> that suppresses the browser's
 * native autofill and the password-manager overlays. Meant for the inputs
 * whose labels or types attract autofill heuristics (user, password, url,
 * mail, tool parameters...) — e.g. the auto-rendered node/subscription
 * parameter forms.
 *
 * Same contract and hardening as LigojAutocomplete: every prop, event, slot
 * and `v-model` is forwarded; the inner <input> gets a KNOWN suppressing
 * `autocomplete` token (`new-password` — newer Chrome ignores both `off` and
 * unknown tokens), a per-instance non-guessable `name`, and the
 * password-manager opt-out attributes.
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
const fieldName = String(attrs.name ?? uniqueFieldName('lj-tf'))
const autocompleteToken = computed(() => (props.autocomplete === 'off' ? 'new-password' : props.autocomplete))

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
  <v-text-field ref="root" v-bind="$attrs" :autocomplete="autocompleteToken" :name="fieldName">
    <!-- Forward every slot the caller declares to the inner component. -->
    <template v-for="(_, slot) in $slots" #[slot]="slotProps">
      <slot :name="slot" v-bind="slotProps ?? {}" />
    </template>
  </v-text-field>
</template>
