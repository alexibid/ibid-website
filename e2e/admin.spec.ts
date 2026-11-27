import { test, expect } from '@playwright/test';
import { isRecord } from '../src/app/domain/models/static-routes.model';
import { ADMIN_E2E_FIXTURES } from '../src/mocks/admin.mock';

test.describe('Admin journey', () => {
  test('opens admin directly without login, edits page, and saves', async ({ page }) => {
    let mockTitle = ADMIN_E2E_FIXTURES.initialTitle;

    await page.route('**/api/v1/pages**', async (route) => {
      const requestUrl = route.request().url();
      if (requestUrl.includes(ADMIN_E2E_FIXTURES.pageEndpointFragment)) {
        const method = route.request().method();
        if (method === 'PATCH' || method === 'PUT') {
          const patchData: unknown = route.request().postDataJSON();
          if (isRecord(patchData) && typeof patchData['title'] === 'string') {
            mockTitle = patchData['title'];
          }
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(ADMIN_E2E_FIXTURES.createPageResponse(mockTitle))
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([ADMIN_E2E_FIXTURES.createPageResponse(mockTitle)])
      });
    });

    await page.route('**/api/v1/urls**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ADMIN_E2E_FIXTURES.createUrlsResponse(mockTitle))
      });
    });

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('a.btn-manage').first()).toBeVisible();

    await page.locator('a.btn-manage').first().click();
    await expect(page).toHaveURL(/.*\/admin\/pt/);

    await page.locator('.btn-edit').first().click();
    await expect(page.locator('#title')).toBeVisible();

    await page.locator('#title').fill(ADMIN_E2E_FIXTURES.updatedTitle);
    await page.locator('button', { hasText: 'Save Changes' }).click();
    await expect.poll(() => mockTitle).toBe(ADMIN_E2E_FIXTURES.updatedTitle);
    await expect(page).toHaveURL(/.*\/admin\/update\//);
  });
});
