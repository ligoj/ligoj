<template>
  <v-menu v-model="open" :close-on-content-click="false" max-width="400" offset="4">
    <template #activator="{ props }">
      <v-btn v-bind="props" icon size="small">
        <v-badge :content="unreadCount" :model-value="unreadCount > 0" color="error" floating>
          <v-icon>mdi-bell-outline</v-icon>
        </v-badge>
      </v-btn>
    </template>

    <v-card min-width="350">
      <v-card-title class="d-flex align-center py-2">
        <span class="text-subtitle-1 font-weight-medium">{{ t('notification.title') }}</span>
        <v-spacer />
        <v-btn
          v-if="notifications.length"
          variant="text"
          size="small"
          @click="markAllRead"
        >{{ t('notification.markAllRead') }}</v-btn>
      </v-card-title>
      <v-divider />
      <v-list v-if="notifications.length" density="compact" class="pa-0" max-height="360" style="overflow-y: auto">
        <v-list-item
          v-for="n in notifications"
          :key="n.id"
          :class="{ 'bg-blue-lighten-5': !n.read }"
          @click="markRead(n)"
        >
          <template #prepend>
            <v-icon :color="n.iconColor || 'grey'" size="small" class="mr-3">{{ n.icon }}</v-icon>
          </template>
          <v-list-item-title class="text-body-2" :class="{ 'font-weight-medium': !n.read }">
            {{ n.message }}
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">{{ formatTime(n.timestamp) }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>
      <v-card-text v-else class="text-center text-medium-emphasis py-6">
        {{ t('notification.empty') }}
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useApi } from '@/composables/useApi.js'
import { useAuthStore } from '@/stores/auth.js'
import { useI18nStore } from '@/stores/i18n.js'

const api = useApi()
const auth = useAuthStore()
const i18n = useI18nStore()
const t = i18n.t

const open = ref(false)
const notifications = ref([])
const demoMode = ref(false)
let pollTimer = null

const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

const DEMO_NOTIFICATIONS = [
  { id: 1, message: 'Project "Ligoj" has been updated', icon: 'mdi-folder', iconColor: 'orange', read: false, timestamp: Date.now() - 300000 },
  { id: 2, message: 'New subscription added: Jenkins', icon: 'mdi-puzzle', iconColor: 'blue', read: false, timestamp: Date.now() - 3600000 },
  { id: 3, message: 'SonarQube quality gate: Warning', icon: 'mdi-shield-alert', iconColor: 'warning', read: true, timestamp: Date.now() - 86400000 },
  { id: 4, message: 'User "jdupont" joined group Engineering', icon: 'mdi-account-plus', iconColor: 'teal', read: true, timestamp: Date.now() - 172800000 },
]

function formatTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 60000) return t('notification.justNow')
  if (diff < 3600000) return t('notification.minutesAgo', { n: Math.floor(diff / 60000) })
  if (diff < 86400000) return t('notification.hoursAgo', { n: Math.floor(diff / 3600000) })
  return t('notification.daysAgo', { n: Math.floor(diff / 86400000) })
}

// The `rest/message` endpoint is optional — some backends don't expose it.
// Silence its errors so a 404 falls through to demo mode instead of raising
// a user-visible toast on every poll.
const SILENT = { silent: true }

function markRead(n) {
  n.read = true
  if (!demoMode.value) {
    api.put(`rest/message/${n.id}/read`, undefined, SILENT)
  }
}

function markAllRead() {
  notifications.value.forEach(n => { n.read = true })
  if (!demoMode.value) {
    api.put('rest/message/read', undefined, SILENT)
  }
}

async function loadNotifications() {
  // Try API first
  const data = await api.get('rest/message?rows=20&page=1&sidx=id&sord=desc', SILENT)
  if (data && !data.code) {
    demoMode.value = false
    notifications.value = (data.data || []).map(m => ({
      id: m.id,
      message: m.value || m.message || '',
      icon: 'mdi-bell',
      iconColor: 'primary',
      read: !!m.read,
      timestamp: m.createdDate || m.created || Date.now(),
    }))
  } else {
    // Demo mode
    demoMode.value = true
    if (!notifications.value.length) {
      notifications.value = [...DEMO_NOTIFICATIONS]
    }
  }
}

onMounted(() => {
  loadNotifications()
  // Poll every 60s
  pollTimer = setInterval(loadNotifications, 60000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>
