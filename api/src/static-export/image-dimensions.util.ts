import { join } from 'node:path';
import type { FileSystemPort } from '../storage/file-system.service';

export interface ImageDimensions {
  readonly width: number;
  readonly height: number;
}

export type ImageDimensionsBySource = ReadonlyMap<string, ImageDimensions>;

type DimensionsReader = (buffer: Buffer) => ImageDimensions;

const WEBP_HEADER_LENGTH = 30;
const FOURTEEN_BIT_MASK = 0x3fff;
const IMAGE_SOURCE = /<img\b[^>]*?\ssrc\s*=\s*["']([^"']+)["']/gi;
const LOCAL_WEBP_SOURCE = /^\/images\/([a-zA-Z0-9_-][a-zA-Z0-9._-]*\.webp)$/;

const CHUNK_READERS: Readonly<Record<string, DimensionsReader>> = {
  VP8X: (buffer) => ({
    width: 1 + buffer.readUIntLE(24, 3),
    height: 1 + buffer.readUIntLE(27, 3),
  }),
  VP8L: (buffer) => {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & FOURTEEN_BIT_MASK) + 1,
      height: ((bits >>> 14) & FOURTEEN_BIT_MASK) + 1,
    };
  },
  'VP8 ': (buffer) => ({
    width: buffer.readUInt16LE(26) & FOURTEEN_BIT_MASK,
    height: buffer.readUInt16LE(28) & FOURTEEN_BIT_MASK,
  }),
};

export function readWebpDimensions(buffer: Buffer): ImageDimensions {
  const isWebp =
    buffer.length >= WEBP_HEADER_LENGTH &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';
  if (!isWebp) {
    throw new Error('Image is not a WebP file');
  }
  const chunk = buffer.toString('ascii', 12, 16);
  const reader = CHUNK_READERS[chunk];
  if (reader === undefined) {
    throw new Error(`Unsupported WebP chunk ${chunk}`);
  }
  return reader(buffer);
}

export async function loadImageDimensions(
  fs: FileSystemPort,
  mediaDir: string,
  htmlPages: readonly string[],
): Promise<ImageDimensionsBySource> {
  const sources = new Set(htmlPages.flatMap(collectLocalImageSources));
  const entries = await Promise.all(
    [...sources].map((source) => readSourceDimensions(fs, mediaDir, source)),
  );
  return new Map(entries.flat());
}

function collectLocalImageSources(html: string): string[] {
  return Array.from(html.matchAll(IMAGE_SOURCE), (match) => match[1]).filter((source) =>
    LOCAL_WEBP_SOURCE.test(source),
  );
}

async function readSourceDimensions(
  fs: FileSystemPort,
  mediaDir: string,
  source: string,
): Promise<[string, ImageDimensions][]> {
  const fileName = LOCAL_WEBP_SOURCE.exec(source)?.[1] ?? '';
  const filePath = join(mediaDir, fileName);
  if (!(await fs.exists(filePath))) {
    return [];
  }
  return [[source, readWebpDimensions(await fs.readBuffer(filePath))]];
}
