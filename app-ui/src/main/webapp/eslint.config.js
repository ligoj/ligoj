import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

/**
 * Flat-config ESLint v9+ setup. Mirrors the legacy `.eslintrc.cjs`:
 *   - eslint:recommended baseline
 *   - plugin:vue/vue3-recommended for SFC + composition rules
 *   - browser + node globals (covers app code, vite/vitest configs)
 *   - unused-vars only warns and tolerates `_`-prefixed args
 */
export default [
  {
    ignores: [
      'node_modules/**',
      // Legacy AMD/RequireJS bundles + assets bundled with this webapp
      // — they predate the Vue rewrite and are full of `$`, `define`,
      // and other globals that shouldn't drag down the new code's lint.
      'dist/**',
      'lib/**',
      'main/**',
      'themes/**',
      'e2e/**',
      'WEB-INF/**',
      '**/.vite/**',
    ],
  },
  js.configs.recommended,
  // `flat/essential` covers correctness rules (no-v-for-key-misuse,
  // no-mutating-props, etc.). The stylistic `vue3-recommended` preset
  // would flood the codebase with attribute-formatting noise that
  // doesn't reflect the conscious one-liner style used here.
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.{js,mjs,cjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      // Vuetify's data-table uses dotted slot names (`#item.foo`).
      // The default rule treats the dot as a directive modifier and
      // flags every cell template. allowModifiers lets these through
      // while still catching real misuses on other directives.
      'vue/valid-v-slot': ['error', { allowModifiers: true }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
]
