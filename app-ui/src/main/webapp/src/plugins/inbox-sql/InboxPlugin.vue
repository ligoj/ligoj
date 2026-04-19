<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-btn v-if="mode !== 'main'" icon variant="text" @click="mode = 'main'" class="mr-1">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <v-icon color="indigo" class="mr-2">mdi-email</v-icon>
      <span v-if="mode === 'main'">Messages</span>
      <span v-else-if="mode === 'detail'">Message</span>
      <span v-else>New Message</span>
      <v-spacer />
      <v-text-field v-if="mode === 'main'" v-model="filter" density="compact" variant="outlined"
        hide-details prepend-inner-icon="mdi-magnify" placeholder="Search..."
        style="max-width: 250px" class="mr-2" @update:model-value="debouncedSearch" />
      <v-btn v-if="mode !== 'new'" color="success" @click="mode = 'new'" prepend-icon="mdi-email-plus">
        New
      </v-btn>
    </v-card-title>

    <v-card-text>
      <v-list v-if="mode === 'main'" lines="three">
        <v-list-item v-if="!messages.length" class="text-center text-medium-emphasis">
          No messages
        </v-list-item>
        <v-list-item v-for="msg in messages" :key="msg.id" @click="viewMessage(msg)"
          :class="{ 'bg-amber-lighten-5': msg.unread }" rounded>
          <template #prepend>
            <v-avatar :color="getAvatarColor(msg)" size="40">
              <span class="text-white text-body-2">{{ getInitials(msg.from) }}</span>
            </v-avatar>
          </template>
          <v-list-item-title class="font-weight-medium">
            {{ getFullName(msg.from) }}
            <v-icon size="x-small" class="mx-1">mdi-arrow-right</v-icon>
            {{ getTargetLabel(msg) }}
          </v-list-item-title>
          <v-list-item-subtitle class="text-body-2">{{ msg.value }}</v-list-item-subtitle>
          <template #append>
            <span class="text-caption text-medium-emphasis">{{ formatAgo(msg.createdDate) }}</span>
          </template>
        </v-list-item>
        <div v-if="messages.length >= pageSize" class="text-center mt-2">
          <v-btn variant="text" @click="loadMore">Load more</v-btn>
        </div>
      </v-list>

      <div v-else-if="mode === 'detail' && selectedMessage">
        <div class="d-flex align-center mb-4">
          <v-avatar :color="getAvatarColor(selectedMessage)" size="56" class="mr-4">
            <span class="text-white text-h6">{{ getInitials(selectedMessage.from) }}</span>
          </v-avatar>
          <div>
            <div class="text-subtitle-1 font-weight-medium">From: {{ getFullName(selectedMessage.from) }}</div>
            <div class="text-body-2 text-medium-emphasis">To: {{ getTargetLabel(selectedMessage) }}</div>
            <div class="text-caption text-medium-emphasis">{{ formatFull(selectedMessage.createdDate) }}</div>
          </div>
        </div>
        <v-divider class="mb-4" />
        <p class="text-body-1">{{ selectedMessage.value }}</p>
      </div>

      <v-form v-else-if="mode === 'new'" @submit.prevent="sendMsg">
        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
          Messages cannot be edited or deleted after sending.
        </v-alert>
        <v-select v-model="newMsg.targetType" :items="targetTypes" label="Recipient Type" />
        <v-text-field v-model="newMsg.target" :label="targetLabel" />
        <div v-if="audience > 0" class="text-caption text-medium-emphasis mb-2">
          Audience: {{ audience }} user(s)
        </div>
        <v-textarea v-model="newMsg.value" label="Message" rows="4" />
        <div class="d-flex justify-end ga-2">
          <v-btn @click="mode = 'main'">Cancel</v-btn>
          <v-btn type="submit" color="success" :loading="sending" prepend-icon="mdi-send"
            :disabled="!newMsg.target || !newMsg.value">Send</v-btn>
        </div>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useInboxApi } from './useInboxApi.js'

const api = useInboxApi()

const mode = ref('main')
const messages = ref([])
const selectedMessage = ref(null)
const filter = ref('')
const page = ref(0)
const pageSize = ref(10)
const sending = ref(false)
const audience = ref(0)

const newMsg = ref({
  targetType: 'user',
  target: '',
  value: ''
})

const targetTypes = [
  { title: 'User', value: 'user' },
  { title: 'Group', value: 'group' },
  { title: 'Company', value: 'company' },
  { title: 'Project', value: 'project' },
  { title: 'Tool', value: 'node' }
]

const targetLabel = computed(() => {
  const labels = {
    user: 'Username',
    group: 'Group Name',
    company: 'Company Name',
    project: 'Project Name',
    node: 'Tool ID'
  }
  return labels[newMsg.value.targetType] || 'Target'
})

const COLORS = ['red', 'blue', 'green', 'purple', 'orange', 'teal']

function getAvatarColor(msg) {
  const name = getFullName(msg.from)
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

function getInitials(user) {
  if (!user) return '?'
  const first = user.firstName?.[0] || ''
  const last = user.lastName?.[0] || ''
  return (first + last).toUpperCase() || '?'
}

function getFullName(user) {
  if (!user) return 'Unknown'
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown'
}

function getTargetLabel(msg) {
  if (msg.targetType === 'user') return msg.targetUser || msg.target
  if (msg.targetType === 'group') return msg.targetGroup || msg.target
  if (msg.targetType === 'company') return msg.targetCompany || msg.target
  if (msg.targetType === 'project') return msg.targetProject || msg.target
  if (msg.targetType === 'node') return msg.target
  return msg.target
}

function formatAgo(timestamp) {
  if (!timestamp) return ''
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function formatFull(timestamp) {
  if (!timestamp) return ''
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(timestamp))
}

let debounceTimer
function debouncedSearch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 0
    loadMessages()
  }, 300)
}

async function loadMessages() {
  try {
    const result = await api.getMessages(page.value, pageSize.value, filter.value)
    if (page.value === 0) {
      messages.value = result.data || []
    } else {
      messages.value.push(...(result.data || []))
    }
  } catch (error) {
    console.error('Failed to load messages:', error)
  }
}

function loadMore() {
  page.value++
  loadMessages()
}

async function viewMessage(msg) {
  selectedMessage.value = msg
  mode.value = 'detail'
  if (msg.unread) {
    try {
      await api.markRead(msg.id)
      msg.unread = false
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }
}

async function sendMsg() {
  sending.value = true
  try {
    await api.sendMessage({
      targetType: newMsg.value.targetType,
      target: newMsg.value.target,
      value: newMsg.value.value
    })
    newMsg.value = { targetType: 'user', target: '', value: '' }
    mode.value = 'main'
    page.value = 0
    await loadMessages()
  } catch (error) {
    console.error('Failed to send message:', error)
  } finally {
    sending.value = false
  }
}

watch(() => newMsg.value.targetType, () => {
  audience.value = 0
})

watch(() => newMsg.value.target, async (target) => {
  if (target && newMsg.value.targetType !== 'user') {
    try {
      const result = await api.getAudience(newMsg.value.targetType, target)
      audience.value = result || 0
    } catch (error) {
      audience.value = 0
    }
  } else {
    audience.value = 0
  }
})

onMounted(() => {
  loadMessages()
})
</script>
