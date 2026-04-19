<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">{{ isEdit ? t('delegate.edit') : t('delegate.new') }}</h1>
    </div>

    <v-skeleton-loader
      v-if="loading"
      type="card, actions"
      max-width="700"
      class="mb-4"
    />

    <v-card v-if="!loading" class="edit-card">
      <v-card-text>
        <v-form ref="formRef" @submit.prevent="save">
          <v-text-field
            v-model="form.receiver"
            :label="t('delegate.receiver')"
            :rules="[rules.required]"
            variant="outlined"
            class="mb-2"
          />
          <v-select
            v-model="form.receiverType"
            :label="t('delegate.receiverType')"
            :items="receiverTypes"
            :rules="[rules.required]"
            variant="outlined"
            class="mb-2"
          />
          <v-text-field
            v-model="form.name"
            :label="t('delegate.resource')"
            :rules="[rules.required]"
            :hint="t('delegate.resourceHint')"
            persistent-hint
            variant="outlined"
            class="mb-2"
          />
          <v-select
            v-model="form.type"
            :label="t('delegate.type')"
            :items="resourceTypes"
            :rules="[rules.required]"
            variant="outlined"
            class="mb-2"
          />
          <v-checkbox
            v-model="form.canAdmin"
            :label="t('delegate.admin')"
            hide-details
            class="mb-2"
          />
          <v-checkbox
            v-model="form.canWrite"
            :label="t('delegate.write')"
            hide-details
            class="mb-2"
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-btn v-if="isEdit" color="error" variant="tonal" @click="confirmDelete = true">
          <v-icon start>mdi-delete</v-icon> {{ t('common.delete') }}
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="router.push('/id/delegate')">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="elevated" :loading="saving" @click="save">
          <v-icon start>mdi-content-save</v-icon> {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog v-model="confirmDelete" max-width="400">
      <v-card>
        <v-card-title>{{ t('delegate.deleteTitle') }}</v-card-title>
        <v-card-text>
          {{ t('delegate.deleteConfirm', { name: form.receiver }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmDelete = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="error" variant="elevated" :loading="deleting" @click="remove">{{ t('common.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showGuardDialog" max-width="400">
      <v-card>
        <v-card-title>{{ t('common.unsavedTitle') }}</v-card-title>
        <v-card-text>{{ t('common.unsavedMsg') }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelLeave">{{ t('common.cancel') }}</v-btn>
          <v-btn color="warning" variant="elevated" @click="confirmLeave">{{ t('common.discard') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi.js'
import { useFormGuard } from '@/composables/useFormGuard.js'
import { useAppStore } from '@/stores/app.js'
import { useI18nStore } from '@/stores/i18n.js'

const route = useRoute()
const router = useRouter()
const api = useApi()
const appStore = useAppStore()
const i18n = useI18nStore()
const t = i18n.t

const formRef = ref(null)
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const confirmDelete = ref(false)

const isEdit = computed(() => !!route.params.id)

const receiverTypes = ['USER', 'GROUP', 'COMPANY']
const resourceTypes = ['USER', 'GROUP', 'COMPANY', 'TREE']

const form = ref({
  receiver: '',
  receiverType: 'USER',
  name: '',
  type: 'GROUP',
  canAdmin: false,
  canWrite: false,
})

const { isDirty, showGuardDialog, confirmLeave, cancelLeave, markClean, init: initGuard } = useFormGuard(form)

const rules = {
  required: v => !!v || t('common.required'),
}

onMounted(async () => {
  if (isEdit.value) {
    loading.value = true
    const data = await api.get(`rest/security/delegate/${route.params.id}`)
    if (data) {
      form.value.receiver = data.receiver?.id || data.receiver || ''
      form.value.receiverType = data.receiverType || 'USER'
      form.value.name = data.name || ''
      form.value.type = data.type || 'GROUP'
      form.value.canAdmin = !!data.canAdmin
      form.value.canWrite = !!data.canWrite
    }
    loading.value = false
    appStore.setTitle(t('delegate.edit'))
    appStore.setBreadcrumbs([
      { title: t('nav.home'), to: '/' },
      { title: t('nav.identity') },
      { title: t('delegate.title'), to: '/id/delegate' },
      { title: form.value.receiver || t('delegate.edit') },
    ])
  } else {
    appStore.setTitle(t('delegate.new'))
    appStore.setBreadcrumbs([
      { title: t('nav.home'), to: '/' },
      { title: t('nav.identity') },
      { title: t('delegate.title'), to: '/id/delegate' },
      { title: t('delegate.new') },
    ])
  }
  initGuard()
})

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  const payload = {
    receiver: form.value.receiver,
    receiverType: form.value.receiverType,
    name: form.value.name,
    type: form.value.type,
    canAdmin: form.value.canAdmin,
    canWrite: form.value.canWrite,
  }

  if (isEdit.value) {
    await api.put('rest/security/delegate', { id: Number(route.params.id), ...payload })
  } else {
    await api.post('rest/security/delegate', payload)
  }
  saving.value = false
  markClean()
  router.push('/id/delegate')
}

async function remove() {
  deleting.value = true
  await api.del(`rest/security/delegate/${route.params.id}`)
  deleting.value = false
  confirmDelete.value = false
  markClean()
  router.push('/id/delegate')
}
</script>

<style scoped>
.edit-card {
  max-width: 700px;
}
@media (max-width: 600px) {
  .edit-card {
    max-width: 100%;
  }
}
</style>
