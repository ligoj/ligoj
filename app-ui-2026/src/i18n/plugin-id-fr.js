// Plugin-local translations merged into the host i18n store at install
// time. Keep keys flat (dot-separated) to match the host's existing
// convention.
//
// Voir en.js pour la rationale : les clés `service:id:*` sont des
// libellés de paramètres possédés par plugin-id et hérités par tous
// ses sous-plugins (plugin-id-ldap, plugin-id-sql, …) ; l'assistant
// d'abonnement les résout via paramLabel()/paramHint().
export default {
  // Libellés de paramètres hérités (possédés par plugin-id).
  'service:id': 'Identité',
  'service:id:group': 'Groupe',
  'service:id:parent-group': 'Groupe parent',
  'service:id:parent-group-description': 'Groupe parent optionnel qui contiendra le nouveau groupe créé',
  'service:id:ou': 'Organisation',
  'service:id:ou-description': 'Unité d\'organisation, ou client, utilisée comme préfixe au nom complet du groupe. Sera créée si elle n\'existe pas.',
  'service:id:ou-not-exists': 'L\'organisation saisie n\'existe pas encore et sera créée. Êtes-vous certain de la syntaxe ?',
  'service:id:uid-pattern': 'Motif d\'utilisateur',
  'service:id:uid-pattern-description': 'Motif de validation de l\'identifiant utilisateur pour accepter une authentification',
  'service:id:group-simple-name': 'Nom simple',
  'service:id:group-simple-name-description': 'Nom simple du groupe, sans le préfixe d\'organisation',

  'delegate.type.user': 'Utilisateur',
  'delegate.type.group': 'Groupe',
  'delegate.type.company': 'Entité',
  'delegate.type.tree': 'Arborescence',
  'delegate.resourceDnHint': 'DN LDAP du sous-arbre (ex. ou=project,dc=acme,dc=com)',
  // Chantier D7 — libellés et aides pour les niveaux de sécurité Admin/Write
  // du dialog de délégation. Textes récupérés du plugin-id legacy.
  'delegate.admin': 'Administration',
  'delegate.write': 'Écriture',
  'delegate.adminHelp': 'Avec le niveau de sécurité d\'administration sur cette ressource, les receveurs de cette délégation peuvent créer d\'autres délégations pour partager cet accès avec d\'autres receveurs valides',
  'delegate.writeHelp': 'Avec le niveau de sécurité d\'écriture, les receveurs de cette délégation peuvent modifier les membres des groupes impliqués. Sans cet accès cette délégation ne donne qu\'un droit de lecture',
  'delegate.adminGranted': 'Administration accordée',
  'delegate.writeGranted': 'Écriture accordée',
  // Fragments encadrant le nom du destinataire en gras-rouge dans la
  // confirmation de suppression (issue #37). Le host garde la clé
  // monolithique `delegate.deleteConfirm` intacte.
  'delegate.deleteConfirmBefore': 'Êtes-vous certain de supprimer la délégation pour ',
  'delegate.deleteConfirmAfter': ' ?',
  'user.deleteConfirmBefore': 'Êtes-vous certain de supprimer ',
  'user.deleteConfirmAfter': ' ?',
  // Chantier D4 — saisie multi-email (v-combobox)
  'user.emailsHint': 'Appuyez sur Entrée ou Tab pour valider chaque email',
  // Chantier D2 (rattrapage) — fragments encadrant le nombre d'éléments
  // en gras-rouge pour la suppression en masse.
  'common.bulkDeleteConfirmBefore': 'Supprimer ',
  'common.bulkDeleteConfirmAfter': ' éléments ? Cette action est irréversible.',
  'common.edit': 'Modifier',
  // Chantier D2 — confirmations sensibles découpées en deux fragments
  // pour insérer l'identifiant en gras-rouge entre eux. Les clés
  // monolithiques `user.<action>Confirm` restent côté host pour
  // d'éventuels autres usages, on les surcharge plus.
  'user.lockConfirmBefore': 'Verrouiller l\'utilisateur ',
  'user.lockConfirmAfter': ' ? Il ne pourra plus se connecter.',
  'user.unlockConfirmBefore': 'Déverrouiller l\'utilisateur ',
  'user.unlockConfirmAfter': ' ? Il pourra à nouveau se connecter.',
  'user.isolateConfirmBefore': 'Isoler l\'utilisateur ',
  'user.isolateConfirmAfter': ' ? Cela supprimera toutes ses appartenances aux groupes.',
  'user.restoreConfirmBefore': 'Restaurer l\'utilisateur ',
  'user.restoreConfirmAfter': ' ?',
  'user.resetPasswordConfirmBefore': 'Réinitialiser le mot de passe de l\'utilisateur ',
  'user.resetPasswordConfirmAfter': ' ? Un nouveau mot de passe lui sera envoyé.',
  'user.statusLocked': 'Verrouillé',
  'user.statusActive': 'Actif',
  'group.deleteConfirmBefore': 'Êtes-vous certain de supprimer ',
  'group.deleteConfirmAfter': ' ?',
  'company.deleteConfirmBefore': 'Êtes-vous certain de supprimer ',
  'company.deleteConfirmAfter': ' ?',
  // Actions de ligne d'abonnement, contribuées via renderFeatures.
  'id.renderFeatures.manage': 'Gérer les membres',
  'id.renderFeatures.help': 'Documentation',
  // Détails de ligne d'abonnement : « clé » stable (nom du groupe) +
  // « features » live (nombre de membres).
  'id.renderDetailsKey.group': 'Groupe',
  'id.renderDetailsFeatures.members': 'Membres',
  // Vue de gestion des membres d'un groupe (portage de id.html legacy).
  'id.group.unknown': '(groupe inconnu)',
  'id.group.subtitle': 'Les membres de ce groupe héritent des permissions de la souscription.',
  'id.group.manage': 'Gérer les membres',
  'id.group.manageTitle': 'Membres du groupe —',
  'id.group.addPlaceholder': 'Rechercher un utilisateur à ajouter',
  'id.group.add': 'Ajouter',
  'id.group.addedToast': '{user} ajouté à {group}',
  'id.group.removeTitle': 'Retirer un membre',
  // Chantier D2 — fragments encadrant l'identifiant utilisateur en gras-rouge.
  'id.group.removeConfirmBefore': 'Retirer ',
  'id.group.removeConfirmAfter': ' du groupe {group} ?',
  'id.group.removedToast': '{user} retiré de {group}',
  'id.group.transitive': 'Membre indirect via un sous-groupe — à gérer depuis le groupe parent.',
  // DN LDAP exposé dans la vue des portées de conteneurs (issue #44).
  // Les autres clés `containerScope.*` vivent dans le host ; celle-ci est
  // contribuée par le plugin et mergée au store i18n à l'install.
  'containerScope.dn': 'Chemin LDAP',

  // 2026 redesign — page subtitle for the Vibrant Users view header.
  'user.subtitle2026': 'Gérez les comptes, leurs entités, groupes et accès.',
  'user.searchPlaceholder': 'Rechercher un utilisateur…',
  'group.subtitle2026': 'Organisez les groupes et leurs membres.',
  'group.searchPlaceholder': 'Rechercher un groupe…',
  'company.subtitle2026': 'Gérez les entités et leur annuaire.',
  'company.searchPlaceholder': 'Rechercher une entité…',
  'delegate.subtitle2026': 'Déléguez des droits d\'administration et d\'écriture.',
  'delegate.searchPlaceholder': 'Rechercher une délégation…',
  'containerScope.subtitle2026': 'Définissez les bases LDAP des groupes et entités.',
  'containerScope.deleteConfirmBefore': 'Êtes-vous certain de supprimer ',
  'containerScope.deleteConfirmAfter': ' ?',
  // Projects cockpit (2026).
  'project.title': 'Projets',
  'project.new': 'Nouveau projet',
  'project.countLabel': 'projets',
  'project.searchPlaceholder': 'Rechercher un projet…',
  'project.subsShort': 'souscr.',
  'project.open': 'Ouvrir le projet',
  'project.noTool': 'Aucun outil',
  'project.createSoon': 'Création de projet — bientôt',
  'project.detailSoon': 'Détail de « {name} » — bientôt',
  'common.preview': 'aperçu',
  // 2026 redesign — VibrantDataTable chrome (not provided by the host).
  'common.rows': 'Lignes',
  'common.of': 'sur',
  'common.previous': 'Précédent',
  'common.next': 'Suivant',
  'common.loading': 'Chargement…',
  'common.noData': 'Aucune donnée',
  'common.export': 'Exporter',
  'common.import': 'Importer',
}
