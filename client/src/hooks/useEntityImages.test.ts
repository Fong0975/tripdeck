import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { showToast } from '@/lib/toast';
import type { AttractionImage } from '@/types';

import { useEntityImages } from './useEntityImages';

vi.mock('@/lib/toast', () => ({
  showToast: vi.fn(),
}));

const images: AttractionImage[] = [{ id: 1, filename: 'a.jpg', title: 'A' }];

describe('useEntityImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes images from initialImages', () => {
    const { result } = renderHook(() =>
      useEntityImages({
        initialImages: images,
        upload: undefined,
        remove: undefined,
      }),
    );

    expect(result.current.images).toEqual(images);
  });

  it('is a no-op when handleUpload is called without an upload function', async () => {
    const { result } = renderHook(() =>
      useEntityImages({
        initialImages: [],
        upload: undefined,
        remove: undefined,
      }),
    );

    await act(() =>
      result.current.handleUpload(new File(['a'], 'a.jpg'), 'Title'),
    );

    expect(result.current.images).toEqual([]);
  });

  it('calls upload and appends the returned image', async () => {
    const newImage: AttractionImage = { id: 2, filename: 'b.jpg', title: 'B' };
    const upload = vi.fn().mockResolvedValue(newImage);
    const file = new File(['b'], 'b.jpg');
    const { result } = renderHook(() =>
      useEntityImages({ initialImages: [], upload, remove: undefined }),
    );

    await act(() => result.current.handleUpload(file, 'B'));

    expect(upload).toHaveBeenCalledWith(file, 'B');
    expect(result.current.images).toEqual([newImage]);
  });

  it('is a no-op when handleDelete is called without a remove function', async () => {
    const { result } = renderHook(() =>
      useEntityImages({
        initialImages: images,
        upload: undefined,
        remove: undefined,
      }),
    );

    await act(() => result.current.handleDelete(1));

    expect(result.current.images).toEqual(images);
  });

  it('calls remove and removes the matching image', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useEntityImages({ initialImages: images, upload: undefined, remove }),
    );

    await act(() => result.current.handleDelete(1));

    expect(remove).toHaveBeenCalledWith(1);
    expect(result.current.images).toEqual([]);
    expect(showToast).toHaveBeenCalledWith('success', '已刪除圖片。');
  });

  it('shows an error toast and keeps the image when remove fails', async () => {
    const remove = vi.fn().mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() =>
      useEntityImages({ initialImages: images, upload: undefined, remove }),
    );

    await act(() => result.current.handleDelete(1));

    expect(result.current.images).toEqual(images);
    expect(showToast).toHaveBeenCalledWith('error', '刪除圖片失敗，請稍後再試');
  });
});
