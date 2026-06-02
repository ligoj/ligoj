// Plugin-local translations merged into the host i18n store at install
// time. Keep keys flat (dot-separated) to match the host's existing
// convention.
//
// Two families live here:
//  1. `service:id:*` keys — labels (and `-description` hints) for the
//     parameters this plugin OWNS. The subscribe wizard auto-resolves
//     `t(parameter.id)` against the host store, so the same keys serve
//     both the parent's own parameters (`service:id:group`, …) and any
//     tool-level plugin that inherits them (e.g. `plugin-id-ldap`'s
//     subscriptions also carry `service:id:ou`, `service:id:parent-group`).
//  2. Vue-only keys (dotted: `id.renderFeatures.manage`, `id.group.*`) —
//     used by the rewritten components.
export default {
  // Inherited parameter labels (owned by plugin-id). Picked up by the
  // wizard via paramLabel()/paramHint() for ANY subscription whose tool
  // is below `service:id` — including LDAP, SQL, and future siblings.
  'service:id': 'Identity',
  'service:id:group': 'Group',
  'service:id:parent-group': 'Parent group',
  'service:id:parent-group-description': 'Optional parent group where the new group will be added',
  'service:id:ou': 'Organization',
  'service:id:ou-description': 'Organizational Unit or customer, used as prefix for the full group name. Will be created if it does not exist.',
  'service:id:ou-not-exists': 'Typed organization does not exist yet and will be created. Are you sure about the syntax?',
  'service:id:uid-pattern': 'User id pattern',
  'service:id:uid-pattern-description': 'User identifier pattern validating an authentication',
  'service:id:group-simple-name': 'Simple name',
  'service:id:group-simple-name-description': 'Simple group name without organisation prefix',

  'delegate.type.user': 'User',
  'delegate.type.group': 'Group',
  'delegate.type.company': 'Company',
  'delegate.type.tree': 'Tree',
  'delegate.resourceDnHint': 'LDAP DN of the subtree (e.g. ou=project,dc=acme,dc=com)',
  // Chantier D7 — labels and help text for the Admin/Write security
  // levels in the delegate dialog. Mirrors the legacy plugin-id wording.
  'delegate.admin': 'Administration',
  'delegate.write': 'Write',
  'delegate.adminHelp': 'With the administration security level on this resource, the receivers of this delegation can create other delegations to share this access with other valid receivers',
  'delegate.writeHelp': 'With the write security level, the receivers of this delegation can modify the members of the involved groups. Without this access, this delegation grants read-only rights',
  'delegate.adminGranted': 'Administration granted',
  'delegate.writeGranted': 'Write access granted',
  // Fragments wrapping the receiver name in bold red on the delete
  // confirmation (issue #37). The host keeps the monolithic
  // `delegate.deleteConfirm` key intact.
  'delegate.deleteConfirmBefore': 'Are you sure you want to delete the delegation for ',
  'delegate.deleteConfirmAfter': '?',
  'user.deleteConfirmBefore': 'Are you sure you want to delete ',
  'user.deleteConfirmAfter': '?',
  // Chantier D4 — multi-email input (v-combobox)
  'user.emailsHint': 'Press Enter or Tab to confirm each email',
  // Chantier D2 (rattrapage) — fragments wrapping the bulk-delete count
  // in bold red.
  'common.bulkDeleteConfirmBefore': 'Are you sure you want to delete ',
  'common.bulkDeleteConfirmAfter': ' items? This cannot be undone.',
  'common.edit': 'Edit',
  // Chantier D2 — sensitive confirmations split in two fragments so the
  // login can be wrapped in bold red between them. The monolithic
  // `user.<action>Confirm` keys stay on the host side for any other
  // consumer; we just stop relying on them here.
  'user.lockConfirmBefore': 'Lock user ',
  'user.lockConfirmAfter': '? They will no longer be able to log in.',
  'user.unlockConfirmBefore': 'Unlock user ',
  'user.unlockConfirmAfter': '? They will be able to log in again.',
  'user.isolateConfirmBefore': 'Isolate user ',
  'user.isolateConfirmAfter': '? This will remove all group memberships.',
  'user.restoreConfirmBefore': 'Restore user ',
  'user.restoreConfirmAfter': '?',
  'user.resetPasswordConfirmBefore': 'Reset password for user ',
  'user.resetPasswordConfirmAfter': '? A new password will be sent.',
  'user.statusLocked': 'Locked',
  'user.statusActive': 'Active',
  'group.deleteConfirmBefore': 'Are you sure you want to delete ',
  'group.deleteConfirmAfter': '?',
  'company.deleteConfirmBefore': 'Are you sure you want to delete ',
  'company.deleteConfirmAfter': '?',
  // Subscription row actions contributed via renderFeatures.
  'id.renderFeatures.manage': 'Manage members',
  'id.renderFeatures.help': 'Documentation',
  // Subscription row details: stable "key" (group name) + live
  // "features" (member count). Mirrors legacy renderDetailsKey /
  // renderDetailsFeatures split.
  'id.renderDetailsKey.group': 'Group',
  'id.renderDetailsFeatures.members': 'Members',
  // Group members management view (ported from legacy id.html).
  'id.group.unknown': '(unknown group)',
  'id.group.subtitle': 'Members of this group inherit the subscription\'s permissions.',
  'id.group.manage': 'Manage members',
  'id.group.manageTitle': 'Group members —',
  'id.group.addPlaceholder': 'Search a user to add',
  'id.group.add': 'Add',
  'id.group.addedToast': 'Added {user} to {group}',
  'id.group.removeTitle': 'Remove member',
  // Chantier D2 — fragments wrapping the user identifier in bold red.
  'id.group.removeConfirmBefore': 'Remove ',
  'id.group.removeConfirmAfter': ' from group {group}?',
  'id.group.removedToast': 'Removed {user} from {group}',
  'id.group.transitive': 'Indirect member through a sub-group — manage them on the parent.',
  // LDAP DN exposed in the container-scope view (issue #44). The other
  // `containerScope.*` keys live in the host; this one is contributed by
  // the plugin and merged into the i18n store at install time.
  'containerScope.dn': 'LDAP path',

  // 2026 redesign — page subtitle for the Vibrant Users view header.
  'user.subtitle2026': 'Manage accounts, their entities, groups and access.',
  'user.searchPlaceholder': 'Search a user…',
  'group.subtitle2026': 'Organise groups and their members.',
  'group.searchPlaceholder': 'Search a group…',
  'company.subtitle2026': 'Manage entities and their directory.',
  'company.searchPlaceholder': 'Search an entity…',
  'delegate.subtitle2026': 'Delegate administration and write rights.',
  'delegate.searchPlaceholder': 'Search a delegation…',
  'containerScope.subtitle2026': 'Define the LDAP bases for groups and entities.',
  'containerScope.deleteConfirmBefore': 'Are you sure you want to delete ',
  'containerScope.deleteConfirmAfter': '?',
  // Projects cockpit (2026).
  'project.title': 'Projects',
  'project.new': 'New project',
  'project.edit': 'Edit project',
  'project.name': 'Name',
  'project.pkey': 'Project key',
  'project.pkeyHint': 'Lowercase letters, digits and dashes',
  'project.pkeyRule': 'Use lowercase letters, digits and dashes',
  'project.pkeyLocked': 'Locked — the project already has subscriptions',
  'project.description': 'Description',
  'project.teamLeader': 'Team leader',
  'project.teamLeaderHint': 'User managing this project',
  'project.countLabel': 'projects',
  'project.searchPlaceholder': 'Search a project…',
  'project.subsShort': 'subs.',
  'project.open': 'Open project',
  'project.noTool': 'No tool',
  'project.createSoon': 'Project creation — coming soon',
  'project.detailSoon': '“{name}” details — coming soon',
  'project.detail.subscriptions': 'Subscriptions',
  'project.detail.edit': 'Edit',
  'project.detail.addSubscription': 'Subscribe to a tool',
  'project.detail.noSubscriptions': 'No subscription on this project yet.',
  'project.detail.activeShort': 'active',
  'project.detail.configure': 'Configure',
  'project.detail.more': 'more',
  'project.detail.demoSubscribe': 'Subscriptions need a real project (this is a preview).',
  'subscription.status.ok': 'up',
  'subscription.status.warn': 'unstable',
  'subscription.status.err': 'down',
  'subscription.status.idle': 'idle',
  // Subscription wizard (2026). Step labels are bare (the dialog renders
  // its own numbered badges).
  'wizard.title': 'Subscribe to a tool',
  'wizard.contextBefore': 'Adding a subscription to',
  'wizard.step.service': 'Service',
  'wizard.step.tool': 'Tool',
  'wizard.step.instance': 'Instance',
  'wizard.step.mode': 'Mode',
  'wizard.step.parameters': 'Parameters',
  'wizard.label.service': 'Pick a service',
  'wizard.label.tool': 'Pick a tool',
  'wizard.label.instance': 'Pick an instance',
  'wizard.label.name': 'Name',
  'wizard.label.id': 'ID',
  'wizard.newInstance': 'New instance',
  'wizard.pickExisting': 'Pick existing',
  'wizard.createInstance': 'Create instance',
  'wizard.modeLink': 'Link',
  'wizard.modeCreate': 'Create',
  'wizard.modeHintLink': 'Attaches this project to an existing instance.',
  'wizard.modeHintCreate': 'Additionally provisions a new instance inside the tool.',
  'wizard.params.emptySubscribe': 'This subscription requires no additional parameters.',
  'wizard.action.createSubscription': 'Create subscription',
  'wizard.error.subscriptionFailed': 'Subscription creation failed — please review the highlighted parameters.',
  'wizard.error.newNodeRejected': 'Backend rejected the new instance — see the notification for details.',
  'wizard.success.subscriptionCreated': 'Subscription created',
  'wizard.rule.required': 'Required',
  'system.plugin.countLabel': 'installed plug-ins',
  'system.plugin.headerType': 'Type',
  'system.plugin.active': 'Active',
  'system.plugin.type.service': 'Service',
  'system.plugin.type.tool': 'Tool',
  'system.plugin.type.feature': 'Feature',
  'system.plugin.statTotal': 'Plug-ins',
  'system.plugin.statServices': 'Services',
  'system.plugin.statTools': 'Tools',
  'system.plugin.statFeatures': 'Features',
  'system.plugin.headerKey': 'Key',
  'system.plugin.headerStatus': 'Status',
  'system.plugin.headerEnabled': 'Enabled',
  'system.plugin.status.ok': 'Active',
  'system.plugin.status.idle': 'Inactive',
  'system.plugin.status.warn': 'Removal scheduled',
  'system.plugin.toggleHint': 'Enable / disable this tool',
  'system.plugin.disable': 'Disable',
  'system.plugin.confirmDisableTitle': 'Disable the tool',
  'system.plugin.confirmDisableText': 'Disable {name}? Its nodes and subscriptions stay configured but become unavailable until re-enabled.',
  'system.node.countLabel': 'declared nodes',
  'system.node.filtered': 'shown',
  'system.node.filterAll': 'All types',
  'system.node.instanceStep': 'Identity',
  'system.node.statTotal': 'Nodes',
  'system.node.deleteConfirmBefore': 'Delete the node ',
  'system.node.deleteConfirmAfter': ' and its parameters?',
  // 2026 redesign — System Configuration view extras (base system.config.* keys
  // ship with the plugin-ui bundle; these add the Vibrant chrome labels).
  'system.config.countLabel': 'configuration keys',
  'system.config.filtered': 'shown',
  'system.config.searchPlaceholder': 'Search a key, value or source…',
  'system.config.filterAll': 'All keys',
  'system.config.statTotal': 'Keys',
  'system.config.statSecured': 'Secured',
  'system.config.statOverridden': 'Overridden',
  'system.config.statDatabase': 'Database',
  'system.config.encryptToggle': 'Encryption tool',
  'system.config.encryptHint': 'Encrypt a value to store it secured at rest.',
  'system.config.copied': 'Copied to clipboard',
  'system.config.deleteConfirmBefore': 'Remove the key ',
  'system.config.deleteConfirmAfter': '?',
  'common.preview': 'preview',
  // 2026 redesign — VibrantDataTable chrome (not provided by the host).
  'common.rows': 'Rows',
  'common.of': 'of',
  'common.previous': 'Previous',
  'common.next': 'Next',
  'common.loading': 'Loading…',
  'common.noData': 'No data',
  'common.export': 'Export',
  'common.import': 'Import',
}
