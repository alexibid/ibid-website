import { TransferState, makeStateKey, type StateKey } from '@angular/core';
import type { CmsPage } from '../../domain/models/cms.interface';
import type { PageType } from '../../domain/models/page-type.enum';

function sectionsKey(type: PageType, lang: string): StateKey<readonly CmsPage[]> {
  return makeStateKey<readonly CmsPage[]>(`page-sections:${type}:${lang}`);
}

export function readTransferredSections(state: TransferState, type: PageType, lang: string): readonly CmsPage[] {
  return state.get(sectionsKey(type, lang), []);
}

export function writeTransferredSections(
  state: TransferState, type: PageType, page: { readonly lang: string; readonly sections: readonly CmsPage[] }
): void {
  state.set(sectionsKey(type, page.lang), page.sections);
}
