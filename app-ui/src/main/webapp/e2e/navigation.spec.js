import { test, expect } from '@playwright/test'

test.describe('Navigation & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('v-index.html')
    await page.waitForLoadState('networkidle')
    // Wait for Vue app to mount
    await page.locator('.v-application').waitFor({ timeout: 15000 })
  })

  test('shows navigation drawer with main sections', async ({ page }) => {
    const nav = page.locator('.v-navigation-drawer')
    await expect(nav).toBeVisible()
    await expect(nav.getByText(/home|accueil/i)).toBeVisible()
    await expect(nav.getByText(/identity|identité/i)).toBeVisible()
    await expect(nav.getByText(/projects|projets/i)).toBeVisible()
  })

  test('navigates to Users page', async ({ page }) => {
    await page.locator('.v-navigation-drawer').getByText(/identity|identité/i).click()
    await page.locator('.v-navigation-drawer').getByText(/users|utilisateurs/i).click()
    await page.waitForURL('**#/id/user**')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/users|utilisateurs/i)
  })

  test('navigates to Projects page', async ({ page }) => {
    await page.locator('.v-navigation-drawer').getByText(/projects|projets/i).click()
    await page.waitForURL('**#/home/project**')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/projects|projets/i)
  })

  test('navigates to Admin page', async ({ page }) => {
    await page.locator('.v-navigation-drawer').getByText(/admin/i).click()
    await page.waitForURL('**#/admin**')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/admin/i)
  })

  test('navigates to Profile page', async ({ page }) => {
    await page.locator('.v-app-bar').getByText('admin').click()
    await page.waitForURL('**#/profile**')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/profile|profil/i)
  })

  test('navigates to About page', async ({ page }) => {
    await page.locator('.v-navigation-drawer').getByText(/about|à propos/i).click()
    await page.waitForURL('**#/about**')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/about|à propos/i)
  })

  test('theme toggle switches between light and dark', async ({ page }) => {
    // Get the initial theme class on the application root
    const app = page.locator('.v-application')
    const initialClass = await app.getAttribute('class')
    // Click the theme toggle icon (weather icon in the app bar)
    await page.locator('.v-app-bar .mdi-weather-night, .v-app-bar .mdi-weather-sunny').click()
    // Wait for theme to apply
    await page.waitForTimeout(500)
    const newClass = await app.getAttribute('class')
    expect(newClass).not.toBe(initialClass)
  })

  test('breadcrumbs update on navigation', async ({ page }) => {
    await page.locator('.v-navigation-drawer').getByText(/identity|identité/i).click()
    await page.locator('.v-navigation-drawer').getByText(/users|utilisateurs/i).click()
    await page.waitForURL('**#/id/user**')
    // Wait for the Users page to mount and set breadcrumbs
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/users|utilisateurs/i)
    const breadcrumbs = page.locator('.v-breadcrumbs')
    await expect(breadcrumbs).toBeVisible({ timeout: 5000 })
    await expect(breadcrumbs).toContainText(/home|accueil/i)
  })
})
