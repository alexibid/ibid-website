import { test, expect, type Page } from '@playwright/test';
import { CONTACT_JOURNEY_FIXTURES } from '../src/mocks/contact-journey.mock';
import { CONTACT_ROUTES, ContactPage } from './pages/contact.page';

type ContactResponse = keyof typeof CONTACT_JOURNEY_FIXTURES.responses;

async function mockContactApi(page: Page, ...replies: readonly ContactResponse[]): Promise<unknown[]> {
  const payloads: unknown[] = [];
  await page.route(CONTACT_JOURNEY_FIXTURES.endpoint, async (route) => {
    const reply = replies[payloads.length] ?? 'success';
    payloads.push(route.request().postDataJSON());
    await route.fulfill(CONTACT_JOURNEY_FIXTURES.responses[reply]);
  });
  return payloads;
}

async function expectTypedText(contact: ContactPage): Promise<void> {
  await expect(contact.nameInput).toHaveValue(CONTACT_JOURNEY_FIXTURES.typed.name);
  await expect(contact.emailInput).toHaveValue(CONTACT_JOURNEY_FIXTURES.typed.email);
  await expect(contact.messageInput).toHaveValue(CONTACT_JOURNEY_FIXTURES.typed.message);
}

test.describe('Contact journey', () => {
  test('should complete a keyboard-only entry with Space and Arrow keys without turning pages', async ({ page }) => {
    const { keyboard } = CONTACT_JOURNEY_FIXTURES;
    const payloads = await mockContactApi(page, 'success');
    const contact = new ContactPage(page);
    const contactUrl = new RegExp(`${CONTACT_ROUTES.pt}$`);
    await contact.goto('pt');

    await contact.tabTo(contact.nameInput);
    await page.keyboard.type(keyboard.nameBeforeSpace);
    await page.keyboard.press('Space');
    await page.keyboard.type(keyboard.nameAfterSpace);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type(keyboard.missingLetter);
    await page.keyboard.press('ArrowRight');
    await expect(contact.nameInput).toHaveValue(keyboard.name);
    await expect(contact.nameInput).toBeFocused();
    await expect(contact.nameInput).toBeInViewport();
    await expect(page).toHaveURL(contactUrl);

    await page.keyboard.press('Tab');
    await expect(contact.emailInput).toBeFocused();
    await page.keyboard.type(keyboard.email);

    await page.keyboard.press('Tab');
    await expect(contact.messageInput).toBeFocused();
    await page.keyboard.type(keyboard.messageFirstLine);
    await page.keyboard.press('Enter');
    await page.keyboard.type(keyboard.messageSecondLine);
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      await page.keyboard.press(key);
    }
    await expect(contact.messageInput).toHaveValue(keyboard.message);
    await expect(contact.messageInput).toBeInViewport();
    await expect(page).toHaveURL(contactUrl);

    await page.keyboard.press('Tab');
    await expect(contact.submitButton).toBeFocused();
    await page.keyboard.press('Space');

    await expect(contact.confirmationBanner).toBeFocused();
    await expect(page).toHaveURL(contactUrl);
    expect(payloads).toEqual([
      expect.objectContaining({ name: keyboard.name, email: keyboard.email, message: keyboard.message })
    ]);
  });

  test('should correct inline errors, recover from offline and server errors keeping typed text, and confirm', async ({
    page,
    context
  }) => {
    const { typed } = CONTACT_JOURNEY_FIXTURES;
    const payloads = await mockContactApi(page, 'serverError', 'success');
    const contact = new ContactPage(page);
    await contact.goto('pt');
    const { errors, 'submission-errors': submissionErrors } = contact.translations;

    await contact.emailInput.fill(typed.invalidEmail);
    await expect(contact.fieldError()).toHaveCount(0);
    await contact.emailInput.press('Tab');
    await expect(contact.fieldError(errors.email.invalid)).toBeVisible();
    await expect(contact.emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(contact.emailInput).toHaveAccessibleDescription(errors.email.invalid);

    await contact.submitButton.click();
    await expect(contact.nameInput).toBeFocused();
    await expect(contact.nameInput).toHaveAccessibleDescription(errors.name.required);
    await expect(contact.messageInput).toHaveAccessibleDescription(errors.message.required);

    await contact.nameInput.fill(typed.name);
    await contact.emailInput.fill(typed.email);
    await contact.messageInput.fill(typed.message);
    await expect(contact.fieldError()).toHaveCount(0);
    await expect(contact.emailInput).not.toHaveAttribute('aria-invalid');
    expect(payloads).toHaveLength(0);

    await context.setOffline(true);
    await contact.submitButton.click();
    await expect(contact.errorAlert).toContainText(submissionErrors.offline);
    await expectTypedText(contact);
    expect(payloads).toHaveLength(0);

    await context.setOffline(false);
    await contact.retryButton.click();
    await expect(contact.errorAlert).toContainText(submissionErrors.server);
    await expectTypedText(contact);

    await contact.retryButton.click();
    await expect(contact.confirmationBanner).toContainText(contact.translations['success-message']);
    await expect(contact.errorAlert).toHaveCount(0);
    await expect(contact.nameInput).toHaveValue('');
    expect(payloads).toHaveLength(2);
  });
});
