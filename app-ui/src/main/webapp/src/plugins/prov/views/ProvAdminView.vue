<template>
  <v-card>
    <v-card-title>{{ t('service.prov.admin') }}</v-card-title>
    <v-card-text>
      <v-list>
        <v-list-item v-for="item in adminItems" :key="item.key" :prepend-icon="item.icon" @click="currentView = item.key">
          <v-list-item-title>{{ t(item.label) }}</v-list-item-title>
        </v-list-item>
      </v-list>
      <component :is="currentComponent" v-if="currentComponent" class="mt-4" />
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, shallowRef } from 'vue'
import { useI18nStore } from '@/stores/i18n'
import CatalogView from './CatalogView.vue'
import CurrencyView from './CurrencyView.vue'
import TerraformView from './TerraformView.vue'

const { t } = useI18nStore()

const currentView = ref(null)

const adminItems = [
  { key: 'catalog', icon: 'mdi-book-open-page-variant', label: 'service.prov.catalog' },
  { key: 'currency', icon: 'mdi-currency-usd', label: 'service.prov.currency' },
  { key: 'terraform', icon: 'mdi-terraform', label: 'Terraform' }
]

const components = {
  catalog: CatalogView,
  currency: CurrencyView,
  terraform: TerraformView
}

const currentComponent = computed(() => {
  return currentView.value ? shallowRef(components[currentView.value]) : null
})
</script>
