import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

const ligojLight = {
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
}

const ligojDark = {
  dark: true,
  colors: {
    primary: '#5c6bc0',
    secondary: '#ffb74d',
    accent: '#42a5f5',
    error: '#ef5350',
    warning: '#fdd835',
    info: '#29b6f6',
    success: '#66bb6a',
    background: '#121212',
    surface: '#1e1e1e',
  },
}

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'ligojLight',
    themes: { ligojLight, ligojDark },
  },
})
