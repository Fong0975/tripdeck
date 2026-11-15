import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/database', async () => {
  const { db } = await import('../../test-utils/dbMocks');
  return db.module;
});

vi.mock('../../storage/imageFiles', () => ({
  saveImportedImageBuffer: vi.fn(),
  deleteImageFromDisk: vi.fn(),
}));

vi.mock('../../logger', async () => {
  const { mockLogger } = await import('../../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

import type { ImageResponse } from '../../types/trip';

import { toPendingImages } from './pendingImages';

describe('toPendingImages', () => {
  const add = vi.fn();

  it.each([
    {
      name: 'returns an empty list for a parent without images',
      images: [] as ImageResponse[],
      expected: [],
    },
    {
      name: 'maps each image under the new parent id, keeping order',
      images: [
        { id: 1, filename: 'a.jpg', title: 'A' },
        { id: 2, filename: 'b.jpg', title: 'B' },
      ],
      expected: [
        { newParentId: 42, filename: 'a.jpg', title: 'A', add },
        { newParentId: 42, filename: 'b.jpg', title: 'B', add },
      ],
    },
  ])('$name', ({ images, expected }) => {
    expect(toPendingImages(images, 42, add)).toEqual(expected);
  });
});
