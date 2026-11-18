import type { Language, PageType } from '../content/content.model.js';

export interface SnapshotPage {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly type: PageType;
  readonly lang: Language;
  readonly location?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface SnapshotUrl {
  readonly url: string;
  readonly lang: Language;
  readonly pageId: string;
}

export interface ContentSnapshot {
  readonly version: 1;
  readonly pages: readonly SnapshotPage[];
  readonly urls: readonly SnapshotUrl[];
  readonly media: readonly string[];
}
