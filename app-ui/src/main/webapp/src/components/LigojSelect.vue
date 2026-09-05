<script setup>
/**
 * LigojSelect — a drop-in <v-select> aligned with LigojAutocomplete: the inner
 * input carries an unmatchable per-instance `autocomplete` token and `name`
 * (plus the password-manager opt-outs) so no native browser suggestion can
 * overlay Vuetify's menu, and the dropdown transition honors the profile's
 * reduce-motion flag. Every prop, event, slot and `v-model` is forwarded.
 */
import { computed, ref, onMounted, useAttrs } from 'vue'
import { uniqueFieldName } from '@/composables/antiAutofill.js'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  // Token placed on the inner <input>. 'off' resolves to an unmatchable token.
  autocomplete: { type: String, default: 'off' },
})

const attrs = useAttrs()
const root = ref(null)
const fieldName = String(attrs.name ?? uniqueFieldName('lj-sel'))
// `new-password` — see LigojAutocomplete: the known token browsers honor to
// fully suppress native autofill (unknown tokens are ignored by newer Chrome).
const autocompleteToken = computed(() => (props.autocomplete === 'off' ? 'new-password' : props.autocomplete))
// Honor the profile's reduce-motion flag: no dropdown transition.
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
  <v-select ref="root" v-bind="$attrs" :name="fieldName" :menu-props="menuProps">
    <template v-for="(_, slot) in $slots" #[slot]="slotProps">
      <slot :name="slot" v-bind="slotProps ?? {}" />
    </template>
  </v-select>
</template>
