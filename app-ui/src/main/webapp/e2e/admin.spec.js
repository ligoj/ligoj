import { test, expect } from '@playwright/test'

test.describe('Admin page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('v-index.html#/admin')
    await page.locator('.v-application').waitFor({ timeout: 15000 })
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/admin/i, { timeout: 15000 })
  })

  test('displays admin page with title', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/admin/i)
  })

  test('shows system status section', async ({ page }) => {
    await expect(page.getByText(/system status|état du système/i)).toBeVisible({ timeout: 10000 })
  })

  test('shows plugins section', async ({ page }) => {
    await expect(page.locator('h2, h3, .text-h5, .text-h6').filter({ hasText: /plugins/i })).toBeVisible({ timeout: 10000 })
  })

  test('shows configuration section', async ({ page }) => {
    await expect(page.locator('h2, h3, .text-h5, .text-h6').filter({ hasText: /config/i })).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Profile page', () => {
  test('displays profile with username', async ({ page }) => {
    await page.goto('v-index.html#/profile')
    await page.waitForLoadState('networkidle')
    await page.locator('.v-application').waitFor({ timeout: 15000 })
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/profile|profil/i, { timeout: 15000 })
    await expect(page.getByRole('main').getByText('admin', { exact: true })).toBeVisible()
  })
})

test.describe('About page', () => {
  test('displays about page with app info', async ({ page }) => {
    await page.goto('v-index.html#/about')
    await page.waitForLoadState('networkidle')
    await page.locator('.v-application').waitFor({ timeout: 15000 })
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/about|à propos/i, { timeout: 15000 })
    await expect(page.getByRole('heading', { name: /ligoj/i })).toBeVisible()
  })
})
