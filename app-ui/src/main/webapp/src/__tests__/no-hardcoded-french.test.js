/**
 * Guard: every text shown to the user comes from the i18n catalogs. No French may stay hardcoded in a component, a
 * view or a dataset, nor a French number format. The login pages run before the catalogs are loaded: they hold their own English and French dictionaries.
 */
import { describe, expect, it } from 'vitest'

const sources = import.meta.glob(['../**/*.{vue,js}', '!../__tests__/**', '!../i18n/**', '!../LoginApp.vue', '!../LoginApiKeyApp.vue', '!../MfaApp.vue', '!../views/LoginView.vue'], { query: '?raw', import: 'default', eager: true })

const FRENCH = /[éèêàçùôîïœ][a-zA-Z]|\b(Accueil|Projets|Outils|Souscriptions|Utilisateurs|Rechercher|Annuler|Enregistrer|Supprimer|Fermer|Ajouter|Modifier|Groupes|Erreur|Chargement|Aucune?|Profil|Saisissez|Sélectionner)\b|fr-FR/

/** Remove the comments: they are not displayed. */
function code(source) {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .map((line) => line.replace(/\s\/\/\s.*$/, ''))
    .join('\n')
}

describe('hardcoded French', () => {
  it('finds source files', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(10)
  })

  it('has none outside the i18n catalogs', () => {
    const found = []
    for (const [path, source] of Object.entries(sources)) {
      code(source).split('\n').forEach((line) => {
        if (FRENCH.test(line.replace(/Français/g, ''))) found.push(`${path}: ${line.trim().slice(0, 90)}`)
      })
    }
    expect(found).toEqual([])
  })
})
