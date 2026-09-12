# Journal des modifications

Ce qui change pour les personnes qui utilisent et administrent Ligoj, sur l'hôte et les plugins de niveau service. Les mises à jour de dépendances, l'outillage et les refactorisations internes sont volontairement omis. [English version](CHANGELOG.md)

Badges de périmètre : 🌐 **Tous** · 🏠 **Cœur** (connexion, profil, navigation, API, déploiement) · 🖥️ **Interface** (tableau de bord, projets, souscriptions, écrans d'administration) · 👤 **Identité** · ☁️ **Provisionnement** · 🗺️ **Cartographie** · 📥 **Boîte de réception** · 🔑 **Mot de passe** · 💻 **VM** · 🐛 **Suivi des anomalies** · 🏗️ **Build** · 📚 **Connaissance** · ✉️ **Courriel** · 🔍 **Qualité** · 📦 **Registre** · 📋 **Exigences** · 🌿 **SCM** · 🛡️ **Sécurité** · 💾 **Stockage**

## 5.0.0 — non publiée

Changements depuis Ligoj 4.1.0 (5 août 2026), y compris les versions de plugins publiées depuis et le travail sur les plugins qui n'avait pas encore été livré.

### ⚠️ Avant de mettre à jour

- 🌐 **Tous** · Ligoj 5.0 s'exécute sur **Java 25** et sur plugin-api 5.0. Les plugins construits pour Ligoj 4.x ne sont pas pris en charge en 5.0 : installez la version compatible 5.0 de chaque plugin listé ci-dessous.
- 🏠 **Cœur** · **PostgreSQL est le seul pilote de base de données embarqué par défaut.** La prise en charge de MySQL et MariaDB doit être activée explicitement à la construction de l'image API, avec le profil Maven `db-mysql` ou `db-mariadb`.
- 🏠 **Cœur** · **L'authentification multi-facteurs est active par défaut** (`security.mfa.enabled=true`) : un utilisateur ayant enregistré un appareil doit confirmer un code après une connexion par formulaire ou par authentification unique. Les clés API et les connexions par en-tête de confiance ne sont pas concernées. Renseignez `ligoj.mfa.rp-id` avec le nom d'hôte du site avant que les utilisateurs n'enregistrent des passkeys et, sur une base existante, ajoutez à la main l'autorisation `USER` pour `^rest/system/mfa.*` : l'amorçage ne s'applique qu'aux nouvelles bases.
- 🏠 **Cœur** · Le chemin de base de l'application web doit correspondre au contexte de l'API. Il est fixé à la construction avec `VITE_BASE` (`/ligoj/` par défaut) ; l'image Docker continue de substituer `CONTEXT_URL` au démarrage, qui peut désormais être vide pour un déploiement à la racine. Quand le contexte change, mettez à jour l'URI de redirection déclarée chez votre fournisseur d'identité.
- ☁️ **Provisionnement** · **Les imports de catalogue s'exécutent dans une seule transaction** avec des insertions par lots. Sur PostgreSQL, laissez `idle_in_transaction_session_timeout` à `0` (ou généreux) et ajoutez `reWriteBatchedInserts=true` à l'URL JDBC, comme décrit dans le README du plugin.
- 💻 **VM** · Les opérations d'alimentation immédiates (démarrer, éteindre, arrêter, redémarrer, réinitialiser, suspendre) que proposait la ligne de souscription ne sont pas encore dans la nouvelle interface ; les opérations passent par les programmations de la page de configuration de la VM.
- 📋 **Exigences** · Le plugin d'exigences n'a pas encore d'écrans dans la nouvelle interface ; ses écrans historiques ne peuvent pas être chargés par Ligoj 5.0.

Versions de plugins compatibles (les versions en attente sont livrées avec la 5.0.0) :

| Plugin | Version | Plugin | Version |
|---|---|---|---|
| 🖥️ plugin-ui | 5.0.2 | 📚 plugin-km | 2.0.0 (en attente) |
| 👤 plugin-id | 5.0.2 | ✉️ plugin-mail | 2.0.1 (en attente) |
| ☁️ plugin-prov | 5.0.1 (en attente) | 🔑 plugin-password | 2.0.2 (en attente) |
| 🏗️ plugin-build | 5.0.1 | 📦 plugin-registry | 1.0.1 (en attente) |
| 🔍 plugin-qa | 5.0.1 (en attente) | 📋 plugin-req | 2.0.0 (en attente) |
| 🐛 plugin-bt | 2.0.0 (en attente) | 🌿 plugin-scm | 2.0.1 (en attente) |
| 🗺️ plugin-cartography | 5.0.0 (en attente) | 🛡️ plugin-security | 2.0.0 (en attente) |
| 📥 plugin-inbox-sql | 5.0.0 (en attente) | 💾 plugin-storage | 2.0.0 (en attente) |
| 🏠 plugin-iam-node | 5.0.0 (en attente) | 💻 plugin-vm | 3.0.0 (en attente) |
| 🏠 plugin-redirect | 2.0.0 (en attente) | 🏠 plugin-sso-salt | 2.0.0 (en attente) |

### ✨ Nouveautés

- 🌐 **Tous** · **Interface refondue pour les services restants.** Provisionnement (devis, catalogue, devises et pages Terraform), suivi des anomalies, cartographie, connaissance, sécurité, stockage et VM utilisent désormais l'interface introduite pour le cœur en 4.x ; leurs écrans historiques sont supprimés.
- 🏠 **Cœur** · **Second facteur à la connexion** : enregistrez une passkey ou une application d'authentification (code à usage unique) depuis la carte Authentification de votre profil, choisissez un appareil par défaut ou retirez-en un. Le code est demandé après les connexions par formulaire et par authentification unique. Le profil indique aussi le fournisseur d'identité en charge de votre compte et votre dernière authentification.
- 🏠 **Cœur** 🖥️ **Interface** · **Vérification d'accès à l'API** depuis votre profil et depuis les pages utilisateur et rôle : saisissez un chemin et une méthode pour savoir s'ils sont autorisés, avec un raccourci qui ouvre l'explorateur d'API dessus.
- 🖥️ **Interface** 🏠 **Cœur** · **Rôles fédérés** : la page des utilisateurs système affiche les rôles accordés via les groupes du fournisseur d'identité, avec le groupe qui les accorde, et la vérification d'accès les inclut.
- 🖥️ **Interface** 🏠 **Cœur** · Onglet **Tâches planifiées** sur la page Tâches : chaque tâche planifiée avec son déclencheur, sa prochaine et sa dernière exécution et son résultat, à côté des exécuteurs de tâches longues.
- 🖥️ **Interface** · **Recherche dans un groupe d'outils** sur la page projet pour filtrer ses souscriptions.
- 🖥️ **Interface** · Section **Modèles de données** dans l'explorateur d'API, listant les types utilisés par les opérations ; la documentation de l'API affiche désormais le Markdown.
- 👤 **Identité** 🏠 **Cœur** · **Affichage configurable des utilisateurs** : `service:id:user-display` accepte n'importe quel attribut ou une expression telle que `${firstName} ${lastName}`, et `service:id:visual-id-name` / `service:id:visual-id-label` choisissent l'attribut affiché, trié et libellé comme identifiant dans les tables d'utilisateurs et de membres de groupe et dans les titres de dialogues.
- 👤 **Identité** · Les **attributs personnalisés** déclarés par le fournisseur d'identité principal sont modifiables dans le dialogue utilisateur, un champ par attribut ; vider un champ supprime l'attribut. Les noms d'attributs sont désormais déclarés une fois sur le service d'identité (`service:id:people-custom-attributes`, proposé sur chaque nœud d'identité) au lieu de chaque outil ; le paramètre de niveau LDAP n'est plus déclaré, une valeur enregistrée avant la mise à jour reste lue tant que celui du service est vide.
- 👤 **Identité** · **Attributs non modifiables** : le paramètre de nœud `service:id:read-only-attributes` liste les attributs utilisateur verrouillés après la création (`firstName`, `lastName`, `company`, `department`, `localId`, `mail` ou `customAttributes.<nom>`) ; le dialogue utilisateur les affiche en lecture seule et l'API refuse une mise à jour qui les modifie.
- 👤 **Identité** · Bascule **« En créer un autre »** sur les dialogues de création d'utilisateur, d'entité, de groupe et de délégation.
- ☁️ **Provisionnement** · **Comparaison de fournisseurs** : conservez d'autres souscriptions de provisionnement comme clones synchronisés d'un devis, voyez l'écart de prix par ressource et un résumé du total et des ressources sans équivalent dans l'autre catalogue, et resynchronisez à tout moment.
- ☁️ **Provisionnement** · **Instantanés du devis** : capturez des versions nommées d'un devis, comparez n'importe quel instantané avec le devis courant et restaurez-en un, les prix étant recalculés sur le catalogue courant.
- ☁️ **Provisionnement** · **Vues enregistrées** : sauvegardez et restaurez la recherche, les filtres, les colonnes, le tri et la période de l'écran de devis, en personnel ou en partagé avec tous les utilisateurs de la souscription.
- ☁️ **Provisionnement** · **Recherche globale et filtres avancés** sur tous les types de ressources (critères de champ et de tag, expressions régulières, comparaisons de coût et de CO₂, ET/OU) ; les compteurs d'onglets et le coût total suivent le filtre actif.
- ☁️ **Provisionnement** · **Édition en masse** des ressources sélectionnées en une opération, avec « Conserver » et « Effacer » par champ ; les prix sont recalculés.
- ☁️ **Provisionnement** · **Répartition des coûts par tag**, avec une catégorie « Sans tag » ; la ventilation des coûts peut aussi être regroupée par tag.
- ☁️ **Provisionnement** · Graphique de **projection mensuelle du coût et du CO₂** dans l'en-tête du devis, et **bascule coût / carbone** avec les statistiques d'efficacité et d'efficacité carbone.
- ☁️ **Provisionnement** · Les **profils d'usage, de budget et d'optimisation** se créent et se modifient depuis les dialogues de devis et de ressource ; les ressources indiquent ce qu'elles héritent, et les tables gagnent les colonnes Terme, Usage et Optimiseur.
- ☁️ **Provisionnement** · **Éditeur de profil de charge** (CPU de base plus périodes à un CPU donné) remplaçant la syntaxe en texte libre.
- ☁️ **Provisionnement** · **Liens réseau** : depuis le menu de ligne d'une instance, base de données, conteneur ou fonction, définissez ses liens entrants et sortants vers d'autres ressources (pair, port, fréquence, débit) ; les lignes affichent leur nombre de liens.
- ☁️ **Provisionnement** · Prise en charge d'**IBM Db2** ; les moteurs de base de données proviennent désormais du catalogue du fournisseur, et les moteurs tarifés uniquement avec licence affichent le sélecteur de licence à côté du moteur.
- 🗺️ **Cartographie** · **Carte réseau** d'un devis, ouverte en plein écran depuis les outils de la page de devis : ressources et liens réseau sous forme de graphe à forces, que vous pouvez regrouper (application, environnement…), dimensionner (CPU, RAM, coût, stockage) et colorer (OS, moteur, localisation, tag…), avec icônes, flux animés, jeux de filtres combinables à conditions négatives, une vue tableau et un export JSON de la carte complète ou filtrée.
- 🏠 **Cœur** · Le clic du milieu sur un menu de navigation l'ouvre dans un nouvel onglet.
- 🏠 **Cœur** · Les passkeys enregistrent les transports signalés par le navigateur à l'enregistrement et les renvoient avec le défi de vérification, pour que le navigateur propose la bonne invite (authentificateur local, téléphone…) ; les passkeys enregistrées auparavant doivent l'être à nouveau pour bénéficier de l'indication. Quand le navigateur lui-même refuse la passkey, la page MFA nomme l'erreur.

### 🔄 Améliorations

- 🏠 **Cœur** · Page de profil : la carte Authentification vient en premier, et les listes de permissions UI et API sont des onglets avec compteurs.
- 🏠 **Cœur** · Les dialogues respectent la préférence « réduire les animations » ; les thèmes par défaut donnent un retour d'ondulation au clic.
- 🏠 **Cœur** · Les plugins sans écrans propres n'ont plus d'entrée de navigation vide ; une icône de plugin désactivée ou manquante est affichée proprement.
- 🖥️ **Interface** · Les « jetons d'API » s'appellent désormais **clés API** partout.
- 🖥️ **Interface** · Les descriptions des paramètres sont affichées en indication lors de l'édition d'un nœud ou de la souscription à un outil.
- 🖥️ **Interface** 👤 **Identité** · Les titres de dialogues affichent l'identifiant du projet, de l'utilisateur, du groupe, de l'entité ou de la délégation sous forme de badge ; la recherche de la liste des projets rejoint les actions de la table.
- 👤 **Identité** · L'import CSV rejoint les outils de la table, à côté de l'export et de la copie ; le menu Identité masque les entrées que vous n'êtes pas autorisé à ouvrir.
- ☁️ **Provisionnement** · En-tête de devis, carte de coût, onglets et tables repensés avec un graphique de ventilation adapté au thème, des barres de capacité sur les ressources, des icônes de notation, d'OS et de moteur de base de données, et des localisations affichées avec drapeau, pays et continent, triées par nom.
- ☁️ **Provisionnement** · Les champs logiciel, licence, processeur, architecture et tag sont des autocomplétions alimentées par le catalogue ; « En créer un autre » conserve toutes les valeurs de la ressource précédente et incrémente le suffixe du nom.
- ☁️ **Provisionnement** · Unités compactes partout (k$, To, t CO₂), y compris sur les cartes de souscription des pages d'accueil et de projet, qui affichent aussi la localisation préférée avec son drapeau.
- ☁️ **Provisionnement** · Infobulles explicatives sur chaque action du devis ; « Tout supprimer » et le sélecteur de colonnes rejoignent les outils d'en-tête de la table ; le menu d'administration regroupe Catalogue, Devise et Terraform sous Provisionnement.

### 🐞 Corrections

- 🌐 **Tous** · Les navigateurs ne remplissent plus automatiquement les identifiants, courriels ou adresses enregistrés dans des champs texte, zones de texte, listes et combobox sans rapport.
- 🏠 **Cœur** · La session était demandée deux fois au démarrage.
- 🏠 **Cœur** · Les blocs d'autorisations UI et API de la carte Permissions du profil n'étaient pas remplis uniformément.
- 🏠 **Cœur** · La documentation des paramètres manquait dans l'explorateur d'API après une régression de l'analyse Javadoc.
- 🏠 **Cœur** · Le servlet par défaut est de nouveau enregistré dans l'application web (des fichiers statiques n'étaient pas servis dans certains déploiements).
- 🖥️ **Interface** · L'en-tête d'actions de la liste des projets n'était pas celui intégré.
- 🖥️ **Interface** · La recherche du chef de projet dans le dialogue de projet ignorait le texte saisi et listait toujours les premiers utilisateurs.
- 👤 **Identité** · Le champ entité du dialogue de nouvel utilisateur paraissait déjà rempli (bouton d'effacement affiché, indication masquée) alors qu'il était vide.
- 👤 **Identité** · La liste déroulante des groupes s'ouvrait toute seule à l'ouverture du dialogue utilisateur ; le focus arrive désormais sur le premier champ, et fermer un dialogue modifié respecte la préférence de profil « ne pas confirmer la sortie ».
- 👤 **Identité** · La recherche d'un utilisateur à ajouter à un groupe ignorait le texte saisi et listait toujours les premiers utilisateurs.
- 👤 **Identité** · La création d'une entité ou d'un groupe par l'API avec un client n'acceptant que du JSON (la CLI, des scripts) était refusée avec un 406 depuis la refonte 5.0 : l'identifiant est produit en texte brut d'abord et en JSON à la demande.
- 👤 **Identité** · L'enregistrement d'un utilisateur depuis le dialogue échouait sur une erreur de validation du courriel : l'API accepte désormais la liste de courriels envoyée par le dialogue, le champ `mail` unique de la CLI et des imports par lot restant pris en charge, et un utilisateur peut être enregistré sans courriel.
- ☁️ **Provisionnement** · Le dialogue de configuration du catalogue ne listait aucune localisation par défaut et n'avait pas de bouton Enregistrer ni Annuler.
- ☁️ **Provisionnement** · Une recherche sans prix correspondant affiche le message « introuvable » au lieu d'échouer silencieusement ; « Actualiser les prix » sans changement est une information, pas une erreur.
- ☁️ **Provisionnement** · Les nouveaux moteurs, types et termes sont visibles juste après un import de catalogue, et non après un redémarrage.
- 💻 **VM** · Prendre ou supprimer une sauvegarde répond immédiatement avec la tâche en cours au lieu de garder la requête ouverte jusqu'à la fin de la sauvegarde, ce qui pouvait finir en délai d'attente de la passerelle.

### 🔧 Administration

- 🏠 **Cœur** · **Kubernetes** : un chart Helm (`charts/ligoj`) déploie l'API, l'application web, la base de données et l'ingress.
- 🏠 **Cœur** · Le paramètre de fournisseur d'identité principal (`feature:iam:node:primary`) est exposé à l'application web, pour que les profils puissent le nommer.
- 🏠 **Cœur** · Démarrage plus rapide : les dépôts JPA sont initialisés à la demande par défaut.
- 🏠 **Cœur** 🖥️ **Interface** · Les plugins peuvent marquer un paramètre comme **obsolète** : les dialogues de nœud et de souscription le signalent et affichent la notice de remplacement du plugin.
- 🖥️ **Interface** · **Gestion des plugins** : activez ou désactivez un plugin, voyez ceux en attente de redémarrage et les statistiques des plugins ; l'**automatisation** planifie les vérifications de mise à jour, les mises à jour automatiques et les fenêtres de maintenance, avec un indicateur de mises à jour dans la barre d'application.
- 🖥️ **Interface** · **Mode démo**, activé depuis le profil : ajoute des groupes d'outils et des projets de démonstration, un aperçu d'enregistrement montrant ce qu'un formulaire enverrait, une puce « Démo » dans la barre d'application et une page vitrine des composants partagés.
- 🖥️ **Interface** · Videz tous les caches d'un coup depuis la page d'administration des caches, avec confirmation.
- 🏠 **Cœur** · L'installation d'un plugin construit pour une version majeure de plugin-api plus récente que l'instance est refusée, avec les versions requise et réelle dans l'erreur et le journal, et le fichier téléchargé est supprimé.
- ☁️ **Provisionnement** · **Configuration par fournisseur** (« Configurer… » sur la page catalogue) : la localisation par défaut des nouveaux devis et des expressions régulières restreignant les régions, types d'instance, systèmes d'exploitation, types de base de données et moteurs importés. Elle remplace le marqueur « préférée » par localisation.
- ☁️ **Provisionnement** · L'infobulle d'état du catalogue affiche les **statistiques d'import** : étape en cours et progression, qui l'a lancé et quand, durée, dernier succès, et le nombre de localisations, de types et de prix.
- ☁️ **Provisionnement** · Un import de catalogue en échec est désormais annulé et conserve le catalogue précédent.
