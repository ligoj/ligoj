/*
 * Tiny module-level reactive state that drives the global
 * `<GroupMembersDialog>` mount. The dialog itself is registered as a
 * header item in `install({...})` so it stays alive across route
 * changes — that's the trick that lets a host-rendered subscription
 * row button (returned by `service.renderFeatures`) trigger an
 * in-plugin dialog without the host needing to know it exists.
 *
 * The state is intentionally NOT a Pinia store: this composable owns
 * a single piece of UI affordance, has no cross-cutting concerns, and
 * the simpler module-level `ref` keeps bundle size tighter than
 * defining a store for two fields.
 */

import { ref, readonly } from 'vue'

/**
 * Dialog state. `onChanged` is the caller-supplied callback that
 * fires once on close IF at least one add/remove happened during the
 * session (the dialog tracks that "dirty" flag locally — see
 * `GroupMembersDialog.vue`). Callbacks live in state instead of as a
 * subscription because openFor → close is a single user gesture; we
 * don't need event-emitter semantics for a one-shot signal.
 */
const state = ref({ open: false, group: '', onChanged: null })

export function useGroupMembersDialog() {
  return {
    /** Read-only handle so callers can't mutate `state` directly. */
    state: readonly(state),
    /**
     * Open the dialog for `groupName`. The optional `onChanged`
     * callback runs once when the dialog closes IF the user added or
     * removed at least one member — letting the caller refresh
     * whatever data depends on the group's membership (the
     * GroupListView's member count column, the host's subscription
     * row feature chips, …) without re-fetching on every single
     * edit.
     *
     * Setting the whole state object also triggers the dialog's
     * `:key` to flip so the inner Panel remounts and rehydrates
     * against the new group.
     */
    openFor(groupName, { onChanged = null } = {}) {
      state.value = {
        open: true,
        group: String(groupName || ''),
        onChanged: typeof onChanged === 'function' ? onChanged : null,
      }
    },
    /**
     * Close the dialog. Clears the group + callback so the next open
     * starts from a clean slate. Dialog's `change-on-close` plumbing
     * runs the callback BEFORE this is invoked (see
     * `GroupMembersDialog.vue`).
     */
    close() {
      state.value = { open: false, group: '', onChanged: null }
    },
  }
}
