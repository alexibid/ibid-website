import { test, expect, type Locator } from '@playwright/test';
import { CONTACT_JOURNEY_FIXTURES } from '../src/mocks/contact-journey.mock';
import { mockContactApi } from './contact-layout.mock';
import {
  ContactPage,
  type ContactSectionBounds,
  type RenderedElementMetrics,
  type ResolvedElementStyle
} from './pages/contact.page';

async function fillValidForm(contact: ContactPage): Promise<void> {
  const { typed } = CONTACT_JOURNEY_FIXTURES;
  await contact.nameInput.fill(typed.name);
  await contact.emailInput.fill(typed.email);
  await contact.messageInput.fill(typed.message);
}

function expectInsideColumn(metrics: RenderedElementMetrics, bounds: ContactSectionBounds): void {
  const fitsColumn = bounds.columns.some(
    (col) =>
      metrics.left >= col.left - 0.5 &&
      metrics.right <= col.right + 0.5 &&
      metrics.top >= col.top - 0.5 &&
      metrics.bottom <= col.bottom + 0.5
  );
  expect(fitsColumn).toBe(true);
}

function expectWithinSectionAndClearance(metrics: RenderedElementMetrics, bounds: ContactSectionBounds): void {
  expect(metrics.width).toBeGreaterThan(0);
  expect(metrics.height).toBeGreaterThan(0);
  expect(metrics.left).toBeGreaterThanOrEqual(bounds.section.left - 0.5);
  expect(metrics.right).toBeLessThanOrEqual(bounds.section.right + 0.5);
  expect(metrics.top).toBeGreaterThanOrEqual(bounds.section.top - 0.5);
  expect(metrics.bottom).toBeLessThanOrEqual(bounds.section.bottom + 0.5);
  expect(metrics.left - bounds.host.left).toBeGreaterThanOrEqual(4);
  expect(bounds.host.right - metrics.right).toBeGreaterThanOrEqual(4);
  expect(metrics.top - bounds.host.top).toBeGreaterThanOrEqual(4);
  expect(bounds.host.bottom - metrics.bottom).toBeGreaterThanOrEqual(4);
  expect(metrics.left - bounds.form.left).toBeGreaterThanOrEqual(3.5);
  expect(bounds.form.right - metrics.right).toBeGreaterThanOrEqual(3.5);
  expectInsideColumn(metrics, bounds);
}

function expectReadableInColumn(metrics: RenderedElementMetrics, bounds: ContactSectionBounds): void {
  expect(metrics.clientRectCount).toBe(1);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
  expectInsideColumn(metrics, bounds);
}

async function expectSectionLocatorsContained(
  contact: ContactPage,
  extraLocators: readonly Locator[],
  activeButton: Locator = contact.submitButton
): Promise<void> {
  expect(await contact.hasHorizontalOverflow()).toBe(false);
  const bounds = await contact.readSectionBounds();
  const baseLocators = [
    contact.nameLabel, contact.nameInput, contact.emailLabel, contact.emailInput,
    contact.messageLabel, contact.messageInput, activeButton, contact.privacyNotice
  ];
  for (const locator of [...baseLocators, ...extraLocators]) {
    expectWithinSectionAndClearance(await contact.readRenderedMetrics(locator), bounds);
  }
}

async function expectTouchTargetAndHoverFocus(contact: ContactPage, target: Locator): Promise<ResolvedElementStyle> {
  const metrics = await contact.readRenderedMetrics(target);
  expect(metrics.height).toBeGreaterThanOrEqual(44);

  const defaultStyle = await contact.readResolvedStyle(target);
  await target.hover();
  await expect.poll(async () => {
    const hoverStyle = await contact.readResolvedStyle(target);
    return (
      hoverStyle.borderColor !== defaultStyle.borderColor ||
      hoverStyle.backgroundColor !== defaultStyle.backgroundColor
    );
  }).toBe(true);

  await contact.movePointerOut();
  await contact.resetFocusAnchor();
  await contact.tabTo(target);
  const focusStyle = await contact.readResolvedStyle(target);
  expect(focusStyle.outlineStyle).not.toBe('none');
  expect(parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(2);
  expect(
    focusStyle.outlineStyle !== defaultStyle.outlineStyle ||
      focusStyle.outlineColor !== defaultStyle.outlineColor ||
      focusStyle.boxShadow !== defaultStyle.boxShadow
  ).toBe(true);

  return defaultStyle;
}

test.describe('Contact layout and styling', () => {
  test('should keep controls, labels, errors, banners, and buttons inside .page-section margins with zero horizontal overflow and unclipped focus clearance', async ({ page }) => {
    const errorGate = (await mockContactApi(page, 'serverError', 'success')).gateCall(0);
    const contact = new ContactPage(page);
    await contact.goto('pt');
    const { errors } = contact.translations;

    const initialBounds = await contact.readSectionBounds();
    expect(initialBounds.columns).toHaveLength(initialBounds.isDesktop ? 2 : 1);
    await expectSectionLocatorsContained(contact, []);

    await contact.submitButton.click();
    const errorLocators = [
      contact.fieldError(errors.name.required),
      contact.fieldError(errors.email.required),
      contact.fieldError(errors.message.required)
    ];
    for (const locator of errorLocators) await expect(locator).toBeVisible();
    await expectSectionLocatorsContained(contact, errorLocators);

    await fillValidForm(contact);
    for (const locator of errorLocators) await expect(locator).toBeHidden();
    const [preBtn, prePrivacy] = await Promise.all([contact.readRenderedMetrics(contact.submitButton), contact.readRenderedMetrics(contact.privacyNotice)]);
    await contact.submitButton.click();
    await errorGate.started;
    await expect(contact.submittingButton).toBeVisible();
    await expectSectionLocatorsContained(contact, [], contact.submittingButton);
    const [busyBtn, busyPrivacy] = await Promise.all([contact.readRenderedMetrics(contact.submittingButton), contact.readRenderedMetrics(contact.privacyNotice)]);
    for (const [actual, before] of [[busyBtn.top, preBtn.top], [busyBtn.left, preBtn.left], [busyBtn.height, preBtn.height], [busyPrivacy.top, prePrivacy.top], [busyPrivacy.left, prePrivacy.left]]) expect(Math.abs(actual - before)).toBeLessThanOrEqual(1);
    expect(busyBtn.bottom).toBeLessThanOrEqual(busyPrivacy.top + 0.5);
    errorGate.release();
    await expect(contact.errorAlert).toBeVisible();
    await expectSectionLocatorsContained(contact, [contact.errorAlert, contact.retryButton]);

    await contact.retryButton.click();
    await expect(contact.confirmationBanner).toBeVisible();
    await expectSectionLocatorsContained(contact, [contact.confirmationBanner, contact.sendAnotherButton]);
  });

  test('should enforce >= 44 px touch targets and distinct default, :hover, :focus-visible, :disabled, and [aria-invalid="true"] styles', async ({
    page
  }) => {
    const api = await mockContactApi(page, 'serverError', 'success');
    const errorGate = api.gateCall(0);

    const contact = new ContactPage(page);
    await contact.goto('pt');

    const fields = [contact.nameInput, contact.emailInput, contact.messageInput];
    const defaultFieldStyles = new Map<Locator, ResolvedElementStyle>();
    for (const field of fields) {
      defaultFieldStyles.set(field, await expectTouchTargetAndHoverFocus(contact, field));
    }
    const defaultSubmitStyle = await expectTouchTargetAndHoverFocus(contact, contact.submitButton);

    await contact.movePointerOut();
    await contact.submitButton.click();
    await contact.resetFocusAnchor();
    for (const field of fields) {
      await expect(field).toHaveAttribute('aria-invalid', 'true');
      const invalidStyle = await contact.readResolvedStyle(field);
      const defaultStyle = defaultFieldStyles.get(field);
      expect(defaultStyle).toBeDefined();
      expect(invalidStyle.borderColor).not.toBe(defaultStyle?.borderColor);
      expect(invalidStyle.backgroundColor).not.toBe(defaultStyle?.backgroundColor);
    }

    await fillValidForm(contact);
    await contact.submitButton.click();
    await errorGate.started;
    await expect(contact.submittingButton).toBeDisabled();
    await expect.poll(async () => (await contact.readResolvedStyle(contact.submittingButton)).boxShadow).toBe('none');
    const disabledSubmitStyle = await contact.readResolvedStyle(contact.submittingButton);
    expect(disabledSubmitStyle.backgroundColor).not.toBe(defaultSubmitStyle.backgroundColor);
    expect(disabledSubmitStyle).toMatchObject({ cursor: 'not-allowed', boxShadow: 'none' });

    errorGate.release();
    await expect(contact.retryButton).toBeVisible();
    await expectTouchTargetAndHoverFocus(contact, contact.retryButton);

    await contact.retryButton.click();
    await expect(contact.sendAnotherButton).toBeVisible();
    await expectTouchTargetAndHoverFocus(contact, contact.sendAnotherButton);
  });

  test('should render validation errors on a single line without overlapping labels or submit button and keep banners readable without cut-off text', async ({
    page
  }) => {
    await mockContactApi(page, 'serverError', 'success');
    const contact = new ContactPage(page);
    await contact.goto('pt');
    const { errors, 'submission-errors': submissionErrors } = contact.translations;

    await contact.submitButton.click();
    const nameError = contact.fieldError(errors.name.required);
    const emailError = contact.fieldError(errors.email.required);
    const messageError = contact.fieldError(errors.message.required);
    await expect(nameError).toBeVisible();
    await expect(emailError).toBeVisible();
    await expect(messageError).toBeVisible();

    const bounds = await contact.readSectionBounds();
    const [nameMetrics, nameErrMetrics, emailLblMetrics] = await Promise.all([
      contact.readRenderedMetrics(contact.nameInput),
      contact.readRenderedMetrics(nameError),
      contact.readRenderedMetrics(contact.emailLabel)
    ]);
    const [emailMetrics, emailErrMetrics, messageLblMetrics] = await Promise.all([
      contact.readRenderedMetrics(contact.emailInput),
      contact.readRenderedMetrics(emailError),
      contact.readRenderedMetrics(contact.messageLabel)
    ]);
    const [messageMetrics, messageErrMetrics, submitMetrics] = await Promise.all([
      contact.readRenderedMetrics(contact.messageInput),
      contact.readRenderedMetrics(messageError),
      contact.readRenderedMetrics(contact.submitButton)
    ]);

    for (const errMetrics of [nameErrMetrics, emailErrMetrics, messageErrMetrics]) {
      expect(errMetrics.lineCount).toBe(1);
      expect(errMetrics.height).toBeLessThanOrEqual(errMetrics.lineHeight * 1.3);
      expectReadableInColumn(errMetrics, bounds);
    }

    expect(nameMetrics.bottom).toBeLessThanOrEqual(nameErrMetrics.top + 0.5);
    expect(nameErrMetrics.bottom).toBeLessThanOrEqual(emailLblMetrics.top + 0.5);
    expect(emailMetrics.bottom).toBeLessThanOrEqual(emailErrMetrics.top + 0.5);
    expect(emailErrMetrics.bottom).toBeLessThanOrEqual(messageLblMetrics.top + 0.5);
    expect(messageMetrics.bottom).toBeLessThanOrEqual(messageErrMetrics.top + 0.5);
    expect(messageErrMetrics.bottom).toBeLessThanOrEqual(submitMetrics.top + 0.5);

    await contact.emailInput.fill(CONTACT_JOURNEY_FIXTURES.typed.invalidEmail);
    await contact.emailInput.press('Tab');
    const invalidEmailError = contact.fieldError(errors.email.invalid);
    await expect(invalidEmailError).toBeVisible();
    const invalidEmailMetrics = await contact.readRenderedMetrics(invalidEmailError);
    expect(invalidEmailMetrics.lineCount).toBe(1);
    expectReadableInColumn(invalidEmailMetrics, bounds);
    expect(invalidEmailMetrics.bottom).toBeLessThanOrEqual(messageLblMetrics.top + 0.5);

    await fillValidForm(contact);
    await contact.submitButton.click();
    await expect(contact.errorAlert).toBeVisible();
    await expect(contact.errorAlert).toContainText(submissionErrors.server);
    expectReadableInColumn(await contact.readRenderedMetrics(contact.errorAlert), await contact.readSectionBounds());

    await contact.retryButton.click();
    await expect(contact.confirmationBanner).toBeVisible();
    await expect(contact.confirmationBanner).toContainText(contact.translations['success-title']);
    await expect(contact.confirmationBanner).toContainText(contact.translations['success-message']);
    expectReadableInColumn(
      await contact.readRenderedMetrics(contact.confirmationBanner),
      await contact.readSectionBounds()
    );
  });

  test('should disable button and field transitions and hover transforms, keep scroll-behavior auto, and scroll instantly to confirmation under emulated prefers-reduced-motion: reduce', async ({
    page
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const api = await mockContactApi(page, 'serverError', 'success');
    const successGate = api.gateCall(1);
    const contact = new ContactPage(page);
    await contact.goto('pt');

    for (const control of [contact.nameInput, contact.emailInput, contact.messageInput, contact.submitButton]) {
      const style = await contact.readResolvedStyle(control);
      expect(style.transitionDuration).toBe('0s');
    }

    await contact.submitButton.hover();
    const hoveredSubmitStyle = await contact.readResolvedStyle(contact.submitButton);
    expect(hoveredSubmitStyle.transitionDuration).toBe('0s');
    expect(hoveredSubmitStyle.transform).toBe('none');

    await fillValidForm(contact);
    await contact.submitButton.click();
    await expect(contact.retryButton).toBeVisible();
    expect((await contact.readResolvedStyle(contact.retryButton)).transitionDuration).toBe('0s');

    await contact.retryButton.click();
    await successGate.started;
    expect(await contact.offsetHostScrollWithProbe()).toBeGreaterThan(0);
    successGate.release();

    await expect(contact.confirmationBanner).toBeVisible();
    await expect(contact.confirmationBanner).toBeFocused();
    await expect(contact.confirmationBanner).toBeInViewport();
    await expect(contact.sendAnotherButton).toBeVisible();
    expect((await contact.readResolvedStyle(contact.sendAnotherButton)).transitionDuration).toBe('0s');

    const scrollState = await contact.readScrollState();
    expect([
      scrollState.documentScrollBehavior,
      scrollState.bookPagesScrollBehavior,
      scrollState.hostScrollBehavior,
      scrollState.bannerScrollBehavior
    ]).toEqual(['auto', 'auto', 'auto', 'auto']);
    expect(scrollState.hostScrollLeft).toBe(0);
    expect(scrollState.scrollToCalls).toContainEqual(expect.objectContaining({ left: 0, behavior: 'instant' }));
    expect(scrollState.scrollToCalls).not.toContainEqual(expect.objectContaining({ behavior: 'smooth' }));
  });
});
