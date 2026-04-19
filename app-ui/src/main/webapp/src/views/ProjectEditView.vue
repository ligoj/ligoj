<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">{{ isEdit ? t('project.edit') : t('project.new') }}</h1>
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
            v-model="form.name"
            :label="t('project.name')"
            :rules="[rules.required]"
            variant="outlined"
            class="mb-2"
          />
          <v-text-field
            v-model="form.pkey"
            :label="t('project.pkey')"
            :rules="[rules.required]"
            :disabled="isEdit"
            :hint="isEdit ? '' : t('project.pkeyHint')"
            persistent-hint
            variant="outlined"
            class="mb-2"
          />
          <v-textarea
            v-model="form.description"
            :label="t('project.description')"
            variant="outlined"
            rows="3"
            class="mb-2"
          />
          <v-text-field
            v-model="form.teamLeader"
            :label="t('project.teamLeader')"
            :hint="t('project.teamLeaderHint')"
            persistent-hint
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
        <v-btn variant="text" @click="router.push('/home/project')">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="elevated" :loading="saving" @click="save">
          <v-icon start>mdi-content-save</v-icon> {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog v-model="confirmDelete" max-width="400">
      <v-card>
        <v-card-title>{{ t('project.deleteTitle') }}</v-card-title>
        <v-card-text>
          {{ t('project.deleteConfirm', { name: form.name }) }}
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

const form = ref({
  name: '',
  pkey: '',
  description: '',
  teamLeader: '',
})

const { isDirty, showGuardDialog, confirmLeave, cancelLeave, markClean, init: initGuard } = useFormGuard(form)

const rules = {
  required: v => !!v || t('common.required'),
}

onMounted(async () => {
  if (isEdit.value) {
    loading.value = true
    const data = await api.get(`rest/project/${route.params.id}`)
    if (data) {
      form.value.name = data.name || ''
      form.value.pkey = data.pkey || ''
      form.value.description = data.description || ''
      form.value.teamLeader = data.teamLeader?.id || ''
    }
    loading.value = false
    appStore.setTitle(t('project.edit'))
    appStore.setBreadcrumbs([
      { title: t('nav.home'), to: '/' },
      { title: t('project.title'), to: '/home/project' },
      { title: data?.name || t('common.edit') },
    ])
  } else {
    appStore.setTitle(t('project.new'))
    appStore.setBreadcrumbs([
      { title: t('nav.home'), to: '/' },
      { title: t('project.title'), to: '/home/project' },
      { title: t('project.new') },
    ])
  }
  initGuard()
})

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  const payload = {
    name: form.value.name,
    pkey: form.value.pkey,
    description: form.value.description,
    teamLeader: form.value.teamLeader || null,
  }

  let result
  if (isEdit.value) {
    result = await api.put('rest/project', { id: Number(route.params.id), ...payload })
    // PUT returns 204 (null) on success
    if (result !== null && result?.code) {
      saving.value = false
      return
    }
  } else {
    result = await api.post('rest/project', payload)
    if (result == null) {
      saving.value = false
      return
    }
  }
  saving.value = false
  markClean()
  router.push('/home/project')
}

async function remove() {
  deleting.value = true
  await api.del(`rest/project/${route.params.id}`)
  deleting.value = false
  confirmDelete.value = false
  markClean()
  router.push('/home/project')
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
