export interface StaticPageMetadata {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly lang: string;
  readonly location?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface StaticUrlEntry {
  readonly id: string;
  readonly url: string;
  readonly lang: string;
  readonly pageId: string;
}

export interface StaticMediaEntry {
  readonly id: string;
  readonly filename: string;
  readonly url: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

export interface StaticRoutesManifest {
  readonly version: number;
  readonly pages: readonly StaticPageMetadata[];
  readonly urls: readonly StaticUrlEntry[];
  readonly media: readonly StaticMediaEntry[];
}

export interface StaticExportResult {
  readonly pagesExported: number;
  readonly urlsExported: number;
  readonly mediaExported: number;
  readonly prerenderRoutesExported: number;
  readonly manifest: StaticRoutesManifest;
}
