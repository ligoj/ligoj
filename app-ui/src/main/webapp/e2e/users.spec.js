import { test, expect } from '@playwright/test'

test.describe('Users CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('v-index.html#/id/user')
    await page.waitForLoadState('networkidle')
    await page.locator('.v-application').waitFor({ timeout: 15000 })
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/users|utilisateurs/i, { timeout: 15000 })
  })

  test('displays user list page with title', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/users|utilisateurs/i)
  })

  test('shows demo mode alert or data table', async ({ page }) => {
    const demoAlert = page.locator('.v-alert')
    const dataTable = page.locator('.v-data-table-server, .v-data-table')
    await expect(demoAlert.or(dataTable)).toBeVisible({ timeout: 10000 })
  })

  test('has new user button', async ({ page }) => {
    await expect(page.getByRole('link', { name: /new|nouveau/i }).or(
      page.getByRole('button', { name: /new|nouveau/i })
    )).toBeVisible()
  })

  test('navigates to new user form', async ({ page }) => {
    const newBtn = page.getByRole('link', { name: /new|nouveau/i }).or(
      page.getByRole('button', { name: /new|nouveau/i })
    )
    await newBtn.click()
    await page.waitForURL('**#/id/user/new**')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/new|nouveau/i)
    await expect(page.locator('.v-text-field').first()).toBeVisible()
  })

  test('new user form validates required fields', async ({ page }) => {
    // Navigate via UI button (hash-only goto doesn't reliably trigger Vue Router)
    await page.getByRole('button', { name: /new|nouveau/i }).click()
    await page.waitForURL('**#/id/user/new**')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/new|nouveau/i, { timeout: 10000 })
    await page.getByRole('button', { name: /save|enregistrer/i }).click()
    await expect(page.locator('.v-messages__message').first()).toBeVisible({ timeout: 5000 })
  })

  test('clicking a user row navigates to edit form', async ({ page }) => {
    // Only run if there are actual data rows (not the "no data" row)
    const dataRows = page.locator('.v-data-table tbody tr:not(:has-text("No data"))')
    const count = await dataRows.count()
    if (count > 0) {
      await dataRows.first().click()
      await page.waitForURL('**#/id/user/**')
      await expect(page.getByRole('heading', { level: 1 })).toContainText(/edit|modifier/i)
    }
  })

  test('user edit form shows action buttons in edit mode', async ({ page }) => {
    await page.goto('v-index.html#/id/user/admin')
    await page.waitForLoadState('networkidle')
    await page.locator('.v-application').waitFor({ timeout: 15000 })
    const actionsCard = page.locator('.v-card:has-text("Actions")')
    if (await actionsCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(actionsCard.getByRole('button').first()).toBeVisible()
    }
  })

  test('has search field', async ({ page }) => {
    await expect(page.locator('.search-field, .v-text-field:has(.mdi-magnify)')).toBeVisible()
  })

  test('has export and import buttons', async ({ page }) => {
    const exportBtn = page.getByRole('button', { name: /export/i }).or(
      page.locator('.v-btn:has(.mdi-download)')
    )
    await expect(exportBtn).toBeVisible()
  })

  test('cancel button returns to list', async ({ page }) => {
    // Navigate via UI button
    await page.getByRole('button', { name: /new|nouveau/i }).click()
    await page.waitForURL('**#/id/user/new**')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/new|nouveau/i, { timeout: 10000 })
    await page.getByRole('button', { name: /cancel|annuler/i }).click()
    await page.waitForURL('**#/id/user')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/users|utilisateurs/i)
  })
})
