import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  retries: 0,
  workers: 3,
  use: {
    baseURL: 'http://localhost:8080/ligoj/',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
    },
    {
      name: 'e2e',
      dependencies: ['setup'],
      use: {
        storageState: 'e2e/fixtures/auth.json',
      },
    },
  ],
})
