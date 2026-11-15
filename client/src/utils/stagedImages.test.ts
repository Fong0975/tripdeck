import { describe, expect, it, vi } from 'vitest';

import { showToast } from '@/components/ui/toast';
import { makeImage } from '@/test-utils/fixtures';

import {
  PARTIAL_IMAGE_UPLOAD_MESSAGE,
  showSavedToast,
  uploadStagedImages,
} from './stagedImages';

vi.mock('@/components/ui/toast');

const fileA = new File(['a'], 'a.jpg');
const fileB = new File(['b'], 'b.jpg');
const imageA = makeImage({ id: 1, filename: 'a.jpg', title: 'A' });
const imageB = makeImage({ id: 2, filename: 'b.jpg', title: 'B' });

describe('uploadStagedImages', () => {
  it.each([
    {
      description: 'no staged images are given',
      staged: undefined,
      outcomes: [],
      expected: { uploaded: [], failedCount: 0 },
    },
    {
      description: 'every upload succeeds',
      staged: [
        { file: fileA, title: 'A' },
        { file: fileB, title: 'B' },
      ],
      outcomes: [imageA, imageB],
      expected: { uploaded: [imageA, imageB], failedCount: 0 },
    },
    {
      description: 'some uploads fail',
      staged: [
        { file: fileA, title: 'A' },
        { file: fileB, title: 'B' },
      ],
      outcomes: [new Error('fail'), imageB],
      expected: { uploaded: [imageB], failedCount: 1 },
    },
  ])(
    'returns uploaded images and failure count when $description',
    async ({ staged, outcomes, expected }) => {
      const upload = vi.fn();
      for (const outcome of outcomes) {
        if (outcome instanceof Error) {
          upload.mockRejectedValueOnce(outcome);
        } else {
          upload.mockResolvedValueOnce(outcome);
        }
      }

      const result = await uploadStagedImages(staged, upload);

      expect(result).toEqual(expected);
      expect(upload).toHaveBeenCalledTimes(staged?.length ?? 0);
    },
  );
});

describe('showSavedToast', () => {
  it.each([
    {
      failedCount: 0,
      variant: 'success' as const,
      message: '已儲存景點。',
    },
    {
      failedCount: 2,
      variant: 'warning' as const,
      message: PARTIAL_IMAGE_UPLOAD_MESSAGE,
    },
  ])(
    'shows a $variant toast when $failedCount uploads failed',
    ({ failedCount, variant, message }) => {
      showSavedToast('已儲存景點。', failedCount);

      expect(showToast).toHaveBeenCalledWith(variant, message);
    },
  );
});
