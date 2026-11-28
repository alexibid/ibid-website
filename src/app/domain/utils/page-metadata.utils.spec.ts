import { buildPageMetadata, readPageSeoFields } from './page-metadata.utils';

const STORED_METADATA = { location: 'I', seoTitle: 'Fake title', seoDescription: 'Fake summary', theme: 'kept' };

describe('page metadata utils', () => {
  it('should read the stored seoDescription into the admin form fields and default to empty', () => {
    expect(readPageSeoFields(STORED_METADATA).seoDescription).toBe('Fake summary');
    expect(readPageSeoFields({ location: 'I' })).toEqual({ seoTitle: '', seoDescription: '', product: false });
  });

  it('should store a trimmed seoDescription in metadata and keep unrelated keys', () => {
    const metadata = buildPageMetadata(STORED_METADATA, {
      location: 'II', seoTitle: '', seoDescription: '  Fake new summary  ', product: false
    });

    expect(metadata).toEqual({ theme: 'kept', location: 'II', seoDescription: 'Fake new summary' });
  });

  it('should drop seoDescription from metadata when the field is left blank', () => {
    const metadata = buildPageMetadata(STORED_METADATA, {
      location: 'I', seoTitle: 'Fake title', seoDescription: '   ', product: false
    });

    expect(metadata).not.toHaveProperty('seoDescription');
  });
});
