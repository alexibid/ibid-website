import type { Page } from '@playwright/test';
import { CONTACT_JOURNEY_FIXTURES } from '../src/mocks/contact-journey.mock';

export type ContactResponse = keyof typeof CONTACT_JOURNEY_FIXTURES.responses;

export interface ContactApiGate {
  readonly started: Promise<void>;
  readonly release: () => void;
}

export interface MockedContactApi {
  readonly gateCall: (targetIndex: number) => ContactApiGate;
}

export async function mockContactApi(
  page: Page,
  ...replies: readonly ContactResponse[]
): Promise<MockedContactApi> {
  let index = 0;
  let gatedIndex = -1;
  let markStarted: (() => void) | undefined;
  let releaseGate: (() => void) | undefined;
  let started = Promise.resolve();
  let gate = Promise.resolve();
  await page.route(CONTACT_JOURNEY_FIXTURES.endpoint, async (route) => {
    const current = index++;
    if (current === gatedIndex) {
      markStarted?.();
      await gate;
    }
    await route.fulfill(CONTACT_JOURNEY_FIXTURES.responses[replies[current] ?? 'success']);
  });
  return {
    gateCall: (targetIndex: number): ContactApiGate => {
      gatedIndex = targetIndex;
      started = new Promise<void>((resolve) => {
        markStarted = resolve;
      });
      gate = new Promise<void>((resolve) => {
        releaseGate = resolve;
      });
      return { started, release: () => releaseGate?.() };
    }
  };
}
