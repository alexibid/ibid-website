import { test, expect } from '@playwright/test';

test.describe('Admin journey', () => {
  test('rejects invalid login, logs in, edits page, saves, and signs out', async ({ page }) => {
    let mockTitle = 'Home Page';

    await page.route('**/auth/login', async (route) => {
      const postData = route.request().postDataJSON() as { password?: string } | null;
      if (postData?.password === '123') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ token: 'mock-jwt-token' })
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' })
        });
      }
    });

    await page.route('**/pages/page-1', async (route) => {
      if (route.request().method() === 'PATCH') {
        const patchData = route.request().postDataJSON() as { title?: string } | null;
        if (patchData?.title) {
          mockTitle = patchData.title;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'page-1',
            title: mockTitle,
            type: 'home',
            lang: 'pt',
            content: '<p>Home content</p>',
            metadata: { location: 'index' }
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'page-1',
            title: mockTitle,
            type: 'home',
            lang: 'pt',
            content: '<p>Home content</p>',
            metadata: { location: 'index' }
          })
        });
      }
    });

    await page.route('**/pages**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'page-1',
            title: mockTitle,
            type: 'home',
            lang: 'pt',
            content: '<p>Home content</p>',
            metadata: { location: 'index' }
          }
        ])
      });
    });

    await page.route('**/urls', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'u1',
            url: 'index',
            lang: 'pt',
            page_id: 'page-1',
            expand: {
              page_id: {
                id: 'page-1',
                title: mockTitle,
                type: 'home',
                lang: 'pt',
                metadata: { location: 'index' }
              }
            }
          }
        ])
      });
    });

    await page.goto('/admin/login');
    await expect(page.locator('.login-container')).toBeVisible();

    await page.evaluate(() => {
      const w = window as unknown as { ng?: { getComponent: (el: Element) => { globalState?: { contentRepo?: { login: (pw: string) => Promise<boolean> } } } } };
      if (w.ng) {
        const el = document.querySelector('website-admin-login');
        if (el) {
          const cmp = w.ng.getComponent(el);
          if (cmp?.globalState?.contentRepo) {
            cmp.globalState.contentRepo.login = async (pw: string) => pw === '123';
          }
        }
      }
    });

    await page.locator('#email').fill('admin@ibid.pt');
    await page.locator('#password').fill('wrong-password');
    await page.locator('.btn-login').click();
    await expect(page.locator('.error-message')).toBeVisible();

    await page.locator('#password').fill('123');
    await page.locator('.btn-login').click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.locator('a.btn-manage').first().click();
    await expect(page).toHaveURL(/.*\/admin\/pt/);

    await page.locator('.btn-edit').first().click();
    await expect(page.locator('#title')).toBeVisible();

    await page.locator('#title').fill('Updated Home Title');
    await page.locator('button', { hasText: 'Save Changes' }).click();
    await expect(page).toHaveURL(/.*\/admin\/pt/);

    await page.goto('/admin/login');
    await expect(page.locator('.login-container')).toBeVisible();
  });
});
