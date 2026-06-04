// Shared type catalog for delegations. Used by:
//   - DelegateEditDialog: drives the v-select items for receiver/resource
//     types and the prepend-inner-icon shown on the selected value.
//   - DelegateListView: maps the raw enum value to a row icon in the
//     Receiver and Resource columns (chantier D5+D8).
//
// The previous inline copy in DelegateEditView would have drifted as soon
// as the list started rendering icons too; this module is the single
// source of truth.

import { computed } from 'vue'

// Raw-enum-keyed icon map. Const at module scope so it's never re-created
// reactively — both the #item slot (dropdown rows) and the
// prepend-inner-icon computed reference the same object.
export const TYPE_ICONS = {
  USER: 'mdi-account',
  GROUP: 'mdi-account-group',
  COMPANY: 'mdi-domain',
  TREE: 'mdi-file-tree',
  // Entity icons reused for dialog titles (issue #51): the container-scope
  // view and delegations have no delegation-enum entry but still need a
  // representative icon. SCOPE matches the file-tree-outline used in the
  // container-scope datatable header.
  SCOPE: 'mdi-file-tree-outline',
  DELEGATE: 'mdi-shield-account-outline',
}

// Receivers cannot be a TREE — only USER / GROUP / COMPANY can hold a
// delegation. Items are plain objects with the raw enum value + an i18n
// key the caller resolves via t() (kept out of this module so the
// composable stays test-friendly).
export const RECEIVER_TYPES = [
  { value: 'USER', titleKey: 'delegate.type.user' },
  { value: 'GROUP', titleKey: 'delegate.type.group' },
  { value: 'COMPANY', titleKey: 'delegate.type.company' },
]

// Resources can additionally be a TREE (LDAP subtree DN).
export const RESOURCE_TYPES = [
  { value: 'USER', titleKey: 'delegate.type.user' },
  { value: 'GROUP', titleKey: 'delegate.type.group' },
  { value: 'COMPANY', titleKey: 'delegate.type.company' },
  { value: 'TREE', titleKey: 'delegate.type.tree' },
]

// Reactive icon helper: pass a ref/computed that yields the current enum
// value and get back a computed yielding the matching MDI string (empty
// if the value is unknown).
export function useTypeIcon(valueRef) {
  return computed(() => TYPE_ICONS[valueRef.value] || '')
}
