import { test, expect } from '@playwright/test'

// These tests do NOT use storageState — they test the login page directly
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('v-login.html')
    await page.waitForLoadState('networkidle')
  })

  test('shows login form', async ({ page }) => {
    await expect(page.getByLabel('Username')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    await expect(page.locator('h1')).toContainText('Ligoj')
  })

  test('rejects empty form submission', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click()
    // Should show validation errors for required fields
    await expect(page.locator('.v-messages__message').first()).toBeVisible({ timeout: 5000 })
  })

  test('successful login redirects to main app', async ({ page }) => {
    // Use a non-admin user to avoid invalidating the admin session used by other tests
    await page.getByLabel('Username').fill('testuser')
    await page.locator('input[type="password"]').fill('testpass')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('**/v-index.html**', { timeout: 15000 })
    await expect(page).toHaveURL(/v-index\.html/)
  })

  test('forgot password link switches to recovery mode', async ({ page }) => {
    await page.getByRole('button', { name: /forgot password|mot de passe oublié/i }).click()
    await expect(page.getByLabel('Username')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible({ timeout: 5000 })
  })
})
