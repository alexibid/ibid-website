import { test, expect } from '@playwright/test';

test.describe('Public site journey', () => {
  test('opens cover, navigates chapters, switches language, and renders 404', async ({ page }) => {
    await page.goto('/pt');
    await expect(page.locator('website-cover#cover')).toBeVisible();

    await page.goto('/pt/percurso-frontend');
    await expect(page.locator('.page-body')).toBeVisible();

    await page.goBack();
    await expect(page.locator('website-cover#cover')).toBeVisible();

    await page.locator('.lang-btn').click();
    await page.locator('.lang-dropdown button', { hasText: 'EN' }).click();
    await expect(page).toHaveURL(/.*\/en/);

    await page.goto('/pt/oh-save-me');
    await expect(page.locator('h1', { hasText: 'Oh Save Me!' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Privacidade local-first' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Os dados ficam no dispositivo' })).toBeVisible();

    await page.goto('/pt/non-existent-route-404');
    await expect(page.locator('.not-found-container')).toBeVisible();
  });
});
