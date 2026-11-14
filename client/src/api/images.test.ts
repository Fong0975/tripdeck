import { describe, expect, it } from 'vitest';

import { apiUrl } from './client';
import { imageUrl } from './images';

describe('imageUrl', () => {
  it.each([{ filename: 'photo.jpg' }, { filename: 'a1b2c3-sunset.webp' }])(
    'serves $filename from the API origin uploads path',
    ({ filename }) => {
      expect(imageUrl(filename)).toBe(apiUrl(`/uploads/${filename}`));
    },
  );

  it('resolves to a root-relative path when no API domain is configured', () => {
    expect(imageUrl('photo.jpg')).toBe('/uploads/photo.jpg');
  });
});
