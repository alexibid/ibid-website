import { describe, expect, it } from 'vitest';
import { isPageInput, isPagePatch, isPageQuery, isUrlInput } from './content.guards.js';
import {
  MOCK_INVALID_PAGE_BODIES,
  MOCK_INVALID_PAGE_PATCHES,
  MOCK_PAGE_INPUTS,
  MOCK_PAGE_PATCHES,
  MOCK_URL_BODIES,
} from './content.mock.js';


describe('content guards', () => {
  it.each(Object.values(MOCK_PAGE_INPUTS))('should accept the page %j', (body) => {
    expect(isPageInput(body)).toBe(true);
  });

  it.each(MOCK_INVALID_PAGE_BODIES)('should refuse the page body %j', (body) => {
    expect(isPageInput(body)).toBe(false);
  });

  it.each(Object.values(MOCK_PAGE_PATCHES))('should accept the change %j', (patch) => {
    expect(isPagePatch(patch)).toBe(true);
  });

  it.each(MOCK_INVALID_PAGE_PATCHES)('should refuse the change %j', (patch) => {
    expect(isPagePatch(patch)).toBe(false);
  });

  it('should accept the url body and refuse broken ones', () => {
    expect(isUrlInput(MOCK_URL_BODIES.valid)).toBe(true);
    for (const body of MOCK_URL_BODIES.invalid) expect(isUrlInput(body)).toBe(false);
  });

  it('should accept page filters only for known types and languages', () => {
    expect(isPageQuery({})).toBe(true);
    expect(isPageQuery({ type: 'chapter', lang: 'pt' })).toBe(true);
    expect(isPageQuery({ type: "chapter' OR 1=1 --" })).toBe(false);
    expect(isPageQuery({ lang: 'de' })).toBe(false);
  });
});
