<template>
  <!-- Globally-mounted dialog (registered as a host header item in
       `install({...})`). Renders nothing visible in the app bar — the
       header-item slot just keeps the component alive across route
       changes; Vuetify's `<v-dialog>` teleports itself to <body> so it
       overlays everything regardless of where this template sits.

       Opened from anywhere via `useGroupMembersDialog().openFor(name)`
       — GroupListView's row action and the host's subscription-row
       buttons (returned by `service.renderFeatures`) both call it. -->
  <v-dialog v-model="open" max-width="1100" scrollable @after-leave="onAfterLeave">
    <v-card class="vmodal">
      <div class="vmodal-head">
        <span class="mi"><v-icon color="#fff">mdi-account-multiple</v-icon></span>
        <h3>{{ t('id.group.manageTitle') }} <span class="who">{{ groupName }}</span></h3>
        <button class="x" :aria-label="t('common.cancel')" @click="onCloseClick"><v-icon size="20">mdi-close</v-icon></button>
      </div>
      <v-card-text class="vmodal-body">
        <!-- :key forces the Panel to remount when the group changes,
             so its internal data-table state (pagination, search,
             selection) starts fresh for each opened group. The
             :v-if-on-open avoids any backend round-trip while the
             dialog is dismissed. -->
        <GroupMembersPanel v-if="open && groupName" :key="groupName" :group-name="groupName" @changed="onChanged" />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18nStore } from '@ligoj/host'
import GroupMembersPanel from './GroupMembersPanel.vue'
import { useGroupMembersDialog } from '../composables/useGroupMembersDialog.js'

const { t } = useI18nStore()
const { state, close } = useGroupMembersDialog()

const groupName = computed(() => state.value.group)
const open = computed({
  get: () => state.value.open,
  set: (v) => { if (!v) close() },
})

/**
 * Tracks whether the user added or removed at least one member
 * during the current session. Flipped to true by the Panel's
 * `changed` event; consumed by `onAfterLeave` to decide whether to
 * fire the caller's `onChanged` callback. Reset whenever a new
 * `openFor` lands so a fresh session starts clean.
 */
const dirty = ref(false)

/**
 * Snapshot of `state.onChanged` taken when the dialog opens. The
 * composable's `close()` resets `state.onChanged` synchronously, but
 * Vuetify's `@after-leave` runs AFTER the exit transition — by which
 * time the state reference would already be null. Holding a local
 * reference dodges that race.
 */
let pendingOnChanged = null

watch(() => state.value.open, (isOpen) => {
  if (isOpen) {
    dirty.value = false
    pendingOnChanged = state.value.onChanged
  }
})

function onChanged() {
  dirty.value = true
}

/** Explicit close button. Same path as backdrop-click / Escape. */
function onCloseClick() {
  close()
}

function onAfterLeave() {
  if (dirty.value && typeof pendingOnChanged === 'function') {
    try { pendingOnChanged() }
    // Swallow caller errors — we don't want a bad refresh handler to
    // strand the dialog state.
    catch (err) { console.warn('[plugin-id] group-members onChanged threw', err) }
  }
  dirty.value = false
  pendingOnChanged = null
}
</script>

<style scoped>
.vmodal {
  border-radius: 20px !important;
  box-shadow: 0 30px 80px -30px rgba(0, 0, 0, .55) !important;
}

.vmodal-head {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 22px 24px 8px;
}

.vmodal-head .mi {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex: none;
  background: linear-gradient(135deg, #ff9436, #ff5a52);
  box-shadow: 0 8px 18px -8px rgba(255, 90, 82, .6);
}

.vmodal-head h3 {
  font-family: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif);
  font-weight: 800;
  font-size: 20px;
  margin: 0;
  flex: 1;
  color: rgb(var(--v-theme-on-surface));
  letter-spacing: -.02em;
}

.vmodal-head h3 .who {
  color: #ff5a52;
}

.vmodal-head .x {
  width: 36px;
  height: 36px;
  border: 0;
  background: transparent;
  border-radius: 9px;
  cursor: pointer;
  display: grid;
  place-items: center;
  color: rgba(var(--v-theme-on-surface), .5);
}

.vmodal-head .x:hover {
  background: rgba(var(--v-theme-on-surface), .06);
  color: rgb(var(--v-theme-on-surface));
}

.vmodal-body {
  padding: 14px 24px 20px !important;
}
</style>
