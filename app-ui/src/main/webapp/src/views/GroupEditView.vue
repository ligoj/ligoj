<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">{{ isEdit ? t('group.edit') : t('group.new') }}</h1>
    </div>

    <v-alert v-if="demoMode" type="info" variant="tonal" density="compact" class="mb-4">
      {{ t('group.demoEdit') }}
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
            v-model="form.name"
            :label="t('common.name')"
            :rules="[rules.required]"
            :disabled="isEdit"
            variant="outlined"
            class="mb-2"
          />
          <v-text-field
            v-model="form.scope"
            :label="t('group.scope')"
            variant="outlined"
            class="mb-2"
          />
          <v-autocomplete
            v-model="form.parent"
            :label="t('group.parent')"
            :items="availableGroups"
            :hint="t('group.parentHint')"
            persistent-hint
            clearable
            variant="outlined"
            class="mb-2"
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-btn v-if="isEdit" color="error" variant="tonal" @click="confirmDelete = true">
          <v-icon start>mdi-delete</v-icon> {{ t('common.delete') }}
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="router.push('/id/group')">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="elevated" :loading="saving" @click="save">
          <v-icon start>mdi-content-save</v-icon> {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog v-model="confirmDelete" max-width="400">
      <v-card>
        <v-card-title>{{ t('group.deleteTitle') }}</v-card-title>
        <v-card-text>
          {{ t('group.deleteConfirm', { name: form.name }) }}
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
const availableGroups = ref([])

const isEdit = computed(() => route.params.id && route.params.id !== 'new')

const form = ref({
  name: '',
  scope: '',
  parent: '',
})

const { isDirty, showGuardDialog, confirmLeave, cancelLeave, markClean, init: initGuard } = useFormGuard(form)

const rules = {
  required: v => !!v || t('common.required'),
}

const DEMO_GROUPS = [
  { name: 'Engineering', scope: 'Group' },
  { name: 'Marketing', scope: 'Group' },
  { name: 'DevOps', scope: 'Group' },
  { name: 'Management', scope: 'Group' },
  { name: 'Sales', scope: 'Group' },
]

onMounted(async () => {
  // Load available groups for parent selector
  const groupList = await api.get('rest/service/id/group')
  if (groupList && Array.isArray(groupList)) {
    availableGroups.value = groupList.map(g => g.name || g.id || g).filter(Boolean)
  } else if (groupList?.data && Array.isArray(groupList.data)) {
    availableGroups.value = groupList.data.map(g => g.name || g.id || g).filter(Boolean)
  } else {
    // Demo fallback
    availableGroups.value = DEMO_GROUPS.map(g => g.name)
  }

  if (isEdit.value) {
    loading.value = true
    const data = await api.get(`rest/service/id/group/${route.params.id}`)
    if (data && !data.code) {
      form.value.name = data.name || ''
      form.value.scope = data.scope || ''
      form.value.parent = data.parent || ''
    } else {
      demoMode.value = true
      errorStore.clear()
      const demo = DEMO_GROUPS.find(g => g.name === route.params.id)
      if (demo) {
        form.value.name = demo.name
        form.value.scope = demo.scope
        form.value.parent = ''
      }
    }
    loading.value = false
    appStore.setTitle(t('group.edit'))
    appStore.setBreadcrumbs([
      { title: t('nav.home'), to: '/' },
      { title: t('nav.identity') },
      { title: t('group.title'), to: '/id/group' },
      { title: form.value.name || t('group.edit') },
    ])
  } else {
    appStore.setTitle(t('group.new'))
    appStore.setBreadcrumbs([
      { title: t('nav.home'), to: '/' },
      { title: t('nav.identity') },
      { title: t('group.title'), to: '/id/group' },
      { title: t('group.new') },
    ])
    const check = await api.get('rest/service/id/group/Engineering')
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
    errorStore.push({ message: t('group.demoSave'), status: 0 })
    return
  }

  saving.value = true
  const payload = { name: form.value.name, scope: form.value.scope, parent: form.value.parent || null }

  if (isEdit.value) {
    await api.put('rest/service/id/group', payload)
  } else {
    await api.post('rest/service/id/group', payload)
  }
  saving.value = false
  markClean()
  router.push('/id/group')
}

async function remove() {
  if (demoMode.value) {
    errorStore.push({ message: t('group.demoDelete'), status: 0 })
    confirmDelete.value = false
    return
  }
  deleting.value = true
  await api.del(`rest/service/id/group/${route.params.id}`)
  deleting.value = false
  confirmDelete.value = false
  markClean()
  router.push('/id/group')
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
