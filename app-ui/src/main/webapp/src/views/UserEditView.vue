<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">{{ isEdit ? t('user.edit') : t('user.new') }}</h1>
    </div>

    <v-alert v-if="demoMode" type="info" variant="tonal" density="compact" class="mb-4">
      {{ t('user.demoEdit') }}
    </v-alert>

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
            v-model="form.id"
            :label="t('user.login')"
            :rules="[rules.required]"
            :disabled="isEdit"
            :hint="isEdit ? '' : t('user.loginHint')"
            persistent-hint
            variant="outlined"
            class="mb-2"
          />
          <v-text-field
            v-model="form.firstName"
            :label="t('user.firstName')"
            :rules="[rules.required]"
            variant="outlined"
            class="mb-2"
          />
          <v-text-field
            v-model="form.lastName"
            :label="t('user.lastName')"
            :rules="[rules.required]"
            variant="outlined"
            class="mb-2"
          />
          <v-text-field
            v-model="form.company"
            :label="t('user.company')"
            variant="outlined"
            class="mb-2"
          />
          <v-text-field
            v-model="form.mail"
            :label="t('user.email')"
            type="email"
            variant="outlined"
            class="mb-2"
          />
          <v-text-field
            v-if="isEdit"
            :model-value="groupsDisplay"
            :label="t('user.groups')"
            variant="outlined"
            readonly
            class="mb-2"
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-btn v-if="isEdit" color="error" variant="tonal" @click="confirmDelete = true">
          <v-icon start>mdi-delete</v-icon> {{ t('common.delete') }}
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="router.push('/id/user')">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="elevated" :loading="saving" @click="save">
          <v-icon start>mdi-content-save</v-icon> {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-card v-if="isEdit && !loading" class="edit-card mt-4">
      <v-card-title class="text-h6">{{ t('user.actions') }}</v-card-title>
      <v-card-text>
        <div class="d-flex flex-wrap ga-2">
          <v-btn
            v-if="!locked"
            color="warning"
            variant="tonal"
            prepend-icon="mdi-lock"
            @click="startAction('lock')"
          >{{ t('user.lock') }}</v-btn>
          <v-btn
            v-if="locked"
            color="success"
            variant="tonal"
            prepend-icon="mdi-lock-open-variant"
            @click="startAction('unlock')"
          >{{ t('user.unlock') }}</v-btn>
          <v-btn
            v-if="!isolated"
            color="error"
            variant="tonal"
            prepend-icon="mdi-account-off"
            @click="startAction('isolate')"
          >{{ t('user.isolate') }}</v-btn>
          <v-btn
            v-if="isolated"
            color="success"
            variant="tonal"
            prepend-icon="mdi-account-check"
            @click="startAction('restore')"
          >{{ t('user.restore') }}</v-btn>
          <v-btn
            color="info"
            variant="tonal"
            prepend-icon="mdi-lock-reset"
            @click="startAction('resetPassword')"
          >{{ t('user.resetPassword') }}</v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-dialog v-model="confirmDelete" max-width="400">
      <v-card>
        <v-card-title>{{ t('user.deleteTitle') }}</v-card-title>
        <v-card-text>
          {{ t('user.deleteConfirm', { id: form.id }) }}
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

    <v-dialog v-model="actionDialog" max-width="400">
      <v-card>
        <v-card-title>{{ t('user.' + actionType) }}</v-card-title>
        <v-card-text>{{ t('user.' + actionType + 'Confirm', { id: form.id }) }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="actionDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="elevated" :loading="actionLoading" @click="confirmAction">{{ t('common.confirm') }}</v-btn>
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
import { useErrorStore } from '@/stores/error.js'
import { useI18nStore } from '@/stores/i18n.js'

const route = useRoute()
const router = useRouter()
const api = useApi()
const appStore = useAppStore()
const errorStore = useErrorStore()
const i18n = useI18nStore()
const t = i18n.t

const formRef = ref(null)
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const confirmDelete = ref(false)
const demoMode = ref(false)
const groups = ref([])
const locked = ref(false)
const isolated = ref(false)
const actionDialog = ref(false)
const actionType = ref('')
const actionLoading = ref(false)

const isEdit = computed(() => !!route.params.id)
const groupsDisplay = computed(() => groups.value.map(g => g.name || g).join(', ') || '-')

const form = ref({
  id: '',
  firstName: '',
  lastName: '',
  company: '',
  mail: '',
})

const { isDirty, showGuardDialog, confirmLeave, cancelLeave, markClean, init: initGuard } = useFormGuard(form)

const rules = {
  required: v => !!v || t('common.required'),
}

// Demo users matching UserListView
const DEMO_USERS = [
  { id: 'admin', firstName: 'Admin', lastName: 'User', company: 'Ligoj', mails: ['admin@ligoj.org'], groups: [{ name: 'Engineering' }, { name: 'Management' }] },
  { id: 'jdupont', firstName: 'Jean', lastName: 'Dupont', company: 'Ligoj', mails: ['jean.dupont@ligoj.org'], groups: [{ name: 'Engineering' }, { name: 'DevOps' }] },
  { id: 'mmartin', firstName: 'Marie', lastName: 'Martin', company: 'AcmeCorp', mails: ['marie.martin@acme.com'], groups: [{ name: 'Marketing' }] },
  { id: 'pdurand', firstName: 'Pierre', lastName: 'Durand', company: 'AcmeCorp', mails: ['pierre.durand@acme.com'], groups: [{ name: 'Engineering' }] },
  { id: 'sleblanc', firstName: 'Sophie', lastName: 'Leblanc', company: 'TechSolutions', mails: ['sophie.leblanc@techsol.com'], groups: [{ name: 'DevOps' }] },
  { id: 'tmoreau', firstName: 'Thomas', lastName: 'Moreau', company: 'TechSolutions', mails: ['thomas.moreau@techsol.com'], groups: [{ name: 'Sales' }] },
  { id: 'crichard', firstName: 'Claire', lastName: 'Richard', company: 'Ligoj', mails: ['claire.richard@ligoj.org'], groups: [{ name: 'Management' }] },
  { id: 'agarcia', firstName: 'Antoine', lastName: 'Garcia', company: 'Ligoj', mails: ['antoine.garcia@ligoj.org'], groups: [{ name: 'Engineering' }] },
]

function loadDemoUser(id) {
  const user = DEMO_USERS.find(u => u.id === id)
  if (user) {
    form.value.id = user.id
    form.value.firstName = user.firstName
    form.value.lastName = user.lastName
    form.value.company = user.company
    form.value.mail = user.mails?.[0] || ''
    groups.value = user.groups || []
    locked.value = !!user.locked
    isolated.value = !!user.isolated
  }
}

onMounted(async () => {
  if (isEdit.value) {
    loading.value = true
    const data = await api.get(`rest/service/id/user/${route.params.id}`)
    if (data && !data.code) {
      form.value.id = data.id || ''
      form.value.firstName = data.firstName || ''
      form.value.lastName = data.lastName || ''
      form.value.company = data.company || ''
      form.value.mail = data.mails?.[0] || ''
      groups.value = data.groups || []
      locked.value = !!data.locked
      isolated.value = !!data.isolated
    } else {
      // API unavailable — use demo data
      demoMode.value = true
      errorStore.clear()
      loadDemoUser(route.params.id)
    }
    loading.value = false
    appStore.setTitle(t('user.edit'))
    appStore.setBreadcrumbs([
      { title: t('nav.home'), to: '/' },
      { title: t('nav.identity') },
      { title: t('user.title'), to: '/id/user' },
      { title: form.value.id || t('user.edit') },
    ])
  } else {
    appStore.setTitle(t('user.new'))
    appStore.setBreadcrumbs([
      { title: t('nav.home'), to: '/' },
      { title: t('nav.identity') },
      { title: t('user.title'), to: '/id/user' },
      { title: t('user.new') },
    ])
    // Check if API is available
    const check = await api.get('rest/service/id/user/admin')
    if (!check || check.code) {
      demoMode.value = true
      errorStore.clear()
    }
  }
  initGuard()
})

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  if (demoMode.value) {
    errorStore.push({ message: t('user.demoSave'), status: 0 })
    return
  }

  saving.value = true
  const payload = {
    id: form.value.id,
    firstName: form.value.firstName,
    lastName: form.value.lastName,
    company: form.value.company,
    mail: form.value.mail,
  }

  if (isEdit.value) {
    await api.put('rest/service/id/user', payload)
  } else {
    await api.post('rest/service/id/user', payload)
  }
  saving.value = false
  markClean()
  router.push('/id/user')
}

async function remove() {
  if (demoMode.value) {
    errorStore.push({ message: t('user.demoDelete'), status: 0 })
    confirmDelete.value = false
    return
  }

  deleting.value = true
  await api.del(`rest/service/id/user/${route.params.id}`)
  deleting.value = false
  confirmDelete.value = false
  markClean()
  router.push('/id/user')
}

function startAction(type) {
  actionType.value = type
  actionDialog.value = true
}

async function confirmAction() {
  if (demoMode.value) {
    errorStore.push({ message: t('user.demoAction'), status: 0 })
    actionDialog.value = false
    return
  }
  actionLoading.value = true
  const id = form.value.id
  const actions = {
    lock: () => api.del(`rest/service/id/user/${id}/lock`),
    unlock: () => api.put(`rest/service/id/user/${id}/unlock`),
    isolate: () => api.del(`rest/service/id/user/${id}/isolate`),
    restore: () => api.put(`rest/service/id/user/${id}/restore`),
    resetPassword: () => api.put(`rest/service/id/user/${id}/reset`),
  }
  await actions[actionType.value]()
  actionLoading.value = false
  actionDialog.value = false
  // Update local state
  if (actionType.value === 'lock') locked.value = true
  if (actionType.value === 'unlock') locked.value = false
  if (actionType.value === 'isolate') isolated.value = true
  if (actionType.value === 'restore') isolated.value = false
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
