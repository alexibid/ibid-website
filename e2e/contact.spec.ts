import { test, expect } from '@playwright/test';

test.describe('Contact journey', () => {
  test('validates fields, handles offline failure, and submits successfully', async ({ page, context }) => {
    await page.route('**/api/v1/contact', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Message sent successfully' })
      });
    });

    await page.goto('/pt/contactos');
    await expect(page.locator('.contact-form')).toBeVisible();

    await page.locator('.submit-btn').click();
    await expect(page.locator('.field-error').first()).toBeVisible();

    await page.locator('#name').fill('Alexandre');
    await page.locator('#email').fill('alex@example.com');
    await page.locator('#message').fill('Hello from journey test');

    await context.setOffline(true);
    await page.locator('.submit-btn').click();
    await expect(page.locator('.form-error-global')).toBeVisible();
    await expect(page.locator('#name')).toHaveText('Alexandre');

    await context.setOffline(false);
    await page.locator('.submit-btn').click();
    await expect(page.locator('.form-error-global')).not.toBeVisible();
  });
});
