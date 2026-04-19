import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import LoginApp from './LoginApp.vue'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'ligojLight',
    themes: {
      ligojLight: {
        dark: false,
        colors: {
          primary: '#1a237e',
          secondary: '#f57c00',
          accent: '#0d47a1',
          error: '#c62828',
          warning: '#f9a825',
          info: '#0277bd',
          success: '#2e7d32',
          background: '#fafafa',
          surface: '#ffffff',
        },
      },
    },
  },
})

const app = createApp(LoginApp)
app.use(createPinia())
app.use(vuetify)
app.mount('#app')
