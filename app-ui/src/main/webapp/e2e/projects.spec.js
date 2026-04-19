import { test, expect } from '@playwright/test'

test.describe('Projects CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('v-index.html#/home/project')
    await page.waitForLoadState('networkidle')
    await page.locator('.v-application').waitFor({ timeout: 15000 })
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/projects|projets/i, { timeout: 15000 })
  })

  test('displays project list page with title', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/projects|projets/i)
  })

  test('shows data table or empty state', async ({ page }) => {
    const dataTable = page.locator('.v-data-table-server, .v-data-table')
    const emptyText = page.getByText(/no projects|aucun projet/i)
    const hasTable = await dataTable.isVisible().catch(() => false)
    const hasEmpty = await emptyText.isVisible().catch(() => false)
    expect(hasTable || hasEmpty).toBeTruthy()
  })

  test('has new project button', async ({ page }) => {
    await expect(page.getByRole('link', { name: /new|nouveau/i }).or(
      page.getByRole('button', { name: /new|nouveau/i })
    )).toBeVisible()
  })

  test('navigates to new project form', async ({ page }) => {
    const newBtn = page.getByRole('link', { name: /new|nouveau/i }).or(
      page.getByRole('button', { name: /new|nouveau/i })
    )
    await newBtn.click()
    await page.waitForURL('**#/home/project/new**')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/new|nouveau/i)
  })

  test('project form has required fields', async ({ page }) => {
    // Navigate via UI button (hash-only goto doesn't reliably trigger Vue Router)
    await page.getByRole('button', { name: /new|nouveau/i }).click()
    await page.waitForURL('**#/home/project/new**')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/new|nouveau/i, { timeout: 10000 })
    const fields = page.locator('.v-text-field, .v-textarea')
    await expect(fields.first()).toBeVisible()
  })

  test('project form validates required fields', async ({ page }) => {
    await page.getByRole('button', { name: /new|nouveau/i }).click()
    await page.waitForURL('**#/home/project/new**')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/new|nouveau/i, { timeout: 10000 })
    await page.getByRole('button', { name: /save|enregistrer/i }).click()
    await expect(page.locator('.v-messages__message').first()).toBeVisible({ timeout: 5000 })
  })

  test('cancel returns to project list', async ({ page }) => {
    await page.getByRole('button', { name: /new|nouveau/i }).click()
    await page.waitForURL('**#/home/project/new**')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/new|nouveau/i, { timeout: 10000 })
    await page.getByRole('button', { name: /cancel|annuler/i }).click()
    await page.waitForURL('**#/home/project')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/projects|projets/i)
  })

  test('has search field', async ({ page }) => {
    await expect(page.locator('.search-field, .v-text-field:has(.mdi-magnify)')).toBeVisible()
  })
})
