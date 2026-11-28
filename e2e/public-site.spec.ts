import { test, expect } from '@playwright/test';
import { PUBLIC_SITE_FIXTURES } from '../src/mocks/public-site.mock';

test.describe('Public site journey', () => {
  test('opens cover, navigates chapters, switches language, and renders 404', async ({ page }) => {
    const { coverRoute, chapter, missingRoute } = PUBLIC_SITE_FIXTURES;
    await page.goto(coverRoute);
    await expect(page.locator('website-cover#cover')).toBeVisible();

    await page.goto(chapter.route);
    await expect(page.locator('.page-body')).toBeVisible();

    await page.goBack();
    await expect(page.locator('website-cover#cover')).toBeVisible();

    await page.locator('.lang-btn').click();
    await page.locator('.lang-dropdown button', { hasText: 'EN' }).click();
    await expect(page).toHaveURL(/.*\/en/);

    await page.goto(chapter.route);
    await expect(page.locator('h1', { hasText: chapter.title })).toBeVisible();
    await expect(page.locator('h2', { hasText: chapter.section })).toBeVisible();
    await expect(page.locator('h3', { hasText: chapter.subsection })).toBeVisible();

    await page.goto(missingRoute);
    await expect(page.locator('.not-found-container')).toBeVisible();
  });
});
