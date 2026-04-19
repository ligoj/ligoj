<template>
  <v-card>
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-currency-usd</v-icon>
        {{ t('service.prov.currency') }}
      </div>
      <v-btn color="primary" size="small" @click="openDialog()">
        <v-icon class="mr-1">mdi-plus</v-icon>
        {{ t('common.add') }}
      </v-btn>
    </v-card-title>
    <v-card-text>
      <v-data-table :headers="headers" :items="currencies" :loading="loading" density="compact" hover>
        <template #item.unit="{ item }">
          <span class="font-weight-bold">{{ item.unit }}</span>
        </template>
        <template #item.rate="{ item }">
          {{ item.rate.toFixed(4) }}
        </template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-pencil" size="x-small" variant="text" @click="openDialog(item)" />
          <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="confirmDelete(item)" />
        </template>
      </v-data-table>
    </v-card-text>
    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>{{ editMode ? t('common.edit') : t('common.add') }} {{ t('service.prov.currency') }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" :label="t('common.name')" density="compact" class="mb-2" />
          <v-text-field v-model="form.description" :label="t('common.description')" density="compact" class="mb-2" />
          <v-text-field v-model="form.unit" :label="t('service.prov.currency.unit')" density="compact" class="mb-2" />
          <v-text-field v-model.number="form.rate" :label="t('service.prov.currency.rate')" type="number" step="0.0001" density="compact" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" @click="save">{{ t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ t('common.confirmDelete') }}</v-card-title>
        <v-card-text>{{ t('service.prov.currency.deleteConfirm', { name: deleteItem?.name }) }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="error" @click="deleteCurrency">{{ t('common.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useProvApi } from '../useProvApi.js'
import { useI18nStore } from '@/stores/i18n'

const { t } = useI18nStore()
const { getCurrencies, createCurrency, updateCurrency, deleteCurrency: apiDeleteCurrency } = useProvApi()

const currencies = ref([])
const loading = ref(false)
const dialog = ref(false)
const deleteDialog = ref(false)
const editMode = ref(false)
const deleteItem = ref(null)
const form = ref({ name: '', description: '', unit: '', rate: 1.0 })

const headers = [
  { title: t('common.name'), key: 'name', sortable: true },
  { title: t('common.description'), key: 'description', sortable: true },
  { title: t('service.prov.currency.unit'), key: 'unit', sortable: true },
  { title: t('service.prov.currency.rate'), key: 'rate', sortable: true },
  { title: t('service.prov.quotes'), key: 'nbQuotes', sortable: true },
  { title: t('common.actions'), key: 'actions', sortable: false, align: 'end' }
]

const openDialog = (item = null) => {
  editMode.value = !!item
  form.value = item ? { ...item } : { name: '', description: '', unit: '', rate: 1.0 }
  dialog.value = true
}

const save = async () => {
  if (editMode.value) {
    await updateCurrency(form.value.id, form.value)
  } else {
    await createCurrency(form.value)
  }
  dialog.value = false
  await loadCurrencies()
}

const confirmDelete = (item) => {
  deleteItem.value = item
  deleteDialog.value = true
}

const deleteCurrency = async () => {
  await apiDeleteCurrency(deleteItem.value.id)
  deleteDialog.value = false
  await loadCurrencies()
}

const loadCurrencies = async () => {
  loading.value = true
  try {
    currencies.value = await getCurrencies()
  } finally {
    loading.value = false
  }
}

onMounted(loadCurrencies)
</script>
