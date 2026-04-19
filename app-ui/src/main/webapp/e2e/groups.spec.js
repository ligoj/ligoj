import { test, expect } from '@playwright/test'

test.describe('Groups', () => {
  test('displays group list page', async ({ page }) => {
    await page.goto('v-index.html#/id/group')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/groups|groupes/i)
  })

  test('has new group button', async ({ page }) => {
    await page.goto('v-index.html#/id/group')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /new|nouveau/i })).toBeVisible()
  })

  test('new group form has name and scope fields', async ({ page }) => {
    await page.goto('v-index.html#/id/group/new')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.v-text-field').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /save|enregistrer/i })).toBeVisible()
  })

  test('group edit form shows parent selector', async ({ page }) => {
    await page.goto('v-index.html#/id/group/Engineering')
    await page.waitForLoadState('networkidle')
    // Should show the parent group autocomplete
    const parentField = page.locator('.v-autocomplete')
    await expect(parentField).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Companies', () => {
  test('displays company list page', async ({ page }) => {
    await page.goto('v-index.html#/id/company')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/companies|entités/i)
  })

  test('has new company button', async ({ page }) => {
    await page.goto('v-index.html#/id/company')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /new|nouveau/i })).toBeVisible()
  })

  test('company edit form has fields', async ({ page }) => {
    await page.goto('v-index.html#/id/company/new')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.v-text-field').first()).toBeVisible()
  })
})

test.describe('Delegates', () => {
  test('displays delegate list page', async ({ page }) => {
    await page.goto('v-index.html#/id/delegate')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/delegates|délégués/i)
  })

  test('has new delegate button', async ({ page }) => {
    await page.goto('v-index.html#/id/delegate')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /new|nouveau/i })).toBeVisible()
  })

  test('delegate edit form has receiver and type fields', async ({ page }) => {
    await page.goto('v-index.html#/id/delegate/new')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.v-text-field').first()).toBeVisible()
    await expect(page.locator('.v-select').first()).toBeVisible()
  })
})
