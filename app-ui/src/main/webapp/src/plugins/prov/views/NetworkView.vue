<template>
  <v-dialog :model-value="true" max-width="800" @update:model-value="$emit('close')">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-network</v-icon>
        {{ t('service.prov.network') }}
      </v-card-title>
      <v-card-text>
        <v-card variant="outlined" class="mb-4">
          <v-card-title class="text-subtitle-2 d-flex justify-space-between align-center">
            {{ t('service.prov.network.inbound') }}
            <v-btn icon="mdi-plus" size="x-small" variant="text" @click="addRow('inbound')" />
          </v-card-title>
          <v-card-text>
            <v-data-table :headers="headers" :items="inbound" density="compact" hide-default-footer>
              <template #item.peer="{ item }">
                <v-select v-model="item.peer" :items="peers" density="compact" hide-details />
              </template>
              <template #item.port="{ item }">
                <v-text-field v-model.number="item.port" type="number" density="compact" hide-details />
              </template>
              <template #item.rate="{ item }">
                <v-text-field v-model.number="item.rate" type="number" density="compact" hide-details />
              </template>
              <template #item.throughput="{ item }">
                <v-text-field v-model.number="item.throughput" type="number" density="compact" hide-details />
              </template>
              <template #item.actions="{ item }">
                <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="removeRow('inbound', item)" />
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>

        <v-card variant="outlined">
          <v-card-title class="text-subtitle-2 d-flex justify-space-between align-center">
            {{ t('service.prov.network.outbound') }}
            <v-btn icon="mdi-plus" size="x-small" variant="text" @click="addRow('outbound')" />
          </v-card-title>
          <v-card-text>
            <v-data-table :headers="headers" :items="outbound" density="compact" hide-default-footer>
              <template #item.peer="{ item }">
                <v-select v-model="item.peer" :items="peers" density="compact" hide-details />
              </template>
              <template #item.port="{ item }">
                <v-text-field v-model.number="item.port" type="number" density="compact" hide-details />
              </template>
              <template #item.rate="{ item }">
                <v-text-field v-model.number="item.rate" type="number" density="compact" hide-details />
              </template>
              <template #item.throughput="{ item }">
                <v-text-field v-model.number="item.throughput" type="number" density="compact" hide-details />
              </template>
              <template #item.actions="{ item }">
                <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="removeRow('outbound', item)" />
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="$emit('close')">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" @click="save">{{ t('common.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useProvApi } from '../useProvApi.js'
import { useI18nStore } from '@/stores/i18n'

const props = defineProps({
  resourceId: { type: Number, required: true }
})

const emit = defineEmits(['close', 'saved'])

const { t } = useI18nStore()
const { getNetworkConfig, saveNetworkConfig, getPeers } = useProvApi()

const inbound = ref([])
const outbound = ref([])
const peers = ref([])

const headers = [
  { title: t('service.prov.network.peer'), key: 'peer', sortable: false },
  { title: t('service.prov.network.port'), key: 'port', sortable: false },
  { title: t('service.prov.network.rate'), key: 'rate', sortable: false },
  { title: t('service.prov.network.throughput'), key: 'throughput', sortable: false },
  { title: '', key: 'actions', sortable: false, align: 'end' }
]

const addRow = (type) => {
  const row = { peer: null, port: 443, rate: 1, throughput: 1000 }
  if (type === 'inbound') {
    inbound.value.push(row)
  } else {
    outbound.value.push(row)
  }
}

const removeRow = (type, item) => {
  const arr = type === 'inbound' ? inbound.value : outbound.value
  const idx = arr.indexOf(item)
  if (idx > -1) arr.splice(idx, 1)
}

const save = async () => {
  await saveNetworkConfig(props.resourceId, { inbound: inbound.value, outbound: outbound.value })
  emit('saved')
  emit('close')
}

onMounted(async () => {
  const config = await getNetworkConfig(props.resourceId)
  inbound.value = config.inbound || []
  outbound.value = config.outbound || []
  peers.value = await getPeers()
})
</script>
