import { test as setup, expect } from '@playwright/test'

setup('authenticate', async ({ page }) => {
  await page.goto('v-login.html')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Username').fill('admin')
  await page.locator('input[type="password"]').fill('admin')
  await page.getByRole('button', { name: /sign in/i }).click()
  // Wait for redirect to main app
  await page.waitForURL('**/v-index.html**', { timeout: 15000 })
  await page.waitForLoadState('networkidle')
  await page.context().storageState({ path: 'e2e/fixtures/auth.json' })
})
