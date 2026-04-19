import { test, expect } from '@playwright/test'

test.describe('Container Scopes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('v-index.html#/id/container-scope')
    await page.waitForLoadState('networkidle')
    // Wait for Vue app to mount
    await page.locator('.v-application').waitFor({ timeout: 15000 })
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/container scopes|portées/i, { timeout: 15000 })
  })

  test('displays container scopes page with title', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/container scopes|portées/i)
  })

  test('has tabs for group and company', async ({ page }) => {
    const tabs = page.locator('.v-tabs')
    await expect(tabs).toBeVisible()
    // Vuetify v-tab renders as buttons with tab-like text
    await expect(page.locator('.v-tab').filter({ hasText: /group/i })).toBeVisible()
    await expect(page.locator('.v-tab').filter({ hasText: /compan/i })).toBeVisible()
  })

  test('has new scope button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new|nouveau/i })).toBeVisible()
  })

  test('shows data table or demo mode', async ({ page }) => {
    const dataTable = page.locator('.v-data-table')
    const demoAlert = page.locator('.v-alert')
    await expect(dataTable.or(demoAlert).first()).toBeVisible({ timeout: 10000 })
  })

  test('switching tabs changes context', async ({ page }) => {
    const companyTab = page.locator('.v-tab').filter({ hasText: /compan/i })
    await companyTab.click()
    await page.waitForTimeout(500)
    const dataTable = page.locator('.v-data-table')
    const demoAlert = page.locator('.v-alert')
    await expect(dataTable.or(demoAlert).first()).toBeVisible({ timeout: 5000 })
  })

  test('new scope button opens dialog', async ({ page }) => {
    await page.getByRole('button', { name: /new|nouveau/i }).click()
    await expect(page.locator('.v-dialog .v-card')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.v-dialog .v-text-field').first()).toBeVisible()
  })
})
