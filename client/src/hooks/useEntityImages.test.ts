import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { showToast } from '@/components/ui/toast';
import { makeImage } from '@/test-utils/fixtures';

import { useEntityImages } from './useEntityImages';

vi.mock('@/components/ui/toast');

const images = [makeImage({ filename: 'a.jpg', title: 'A' })];

describe('useEntityImages', () => {
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
    const newImage = makeImage({ id: 2, filename: 'b.jpg', title: 'B' });
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

  it.each([
    {
      description: 'an upload succeeds',
      upload: () => Promise.resolve(makeImage({ id: 2 })),
      remove: undefined,
      act: (r: ReturnType<typeof useEntityImages>) =>
        r.handleUpload(new File(['b'], 'b.jpg'), 'B'),
      expectedCalls: 1,
    },
    {
      description: 'a delete succeeds',
      upload: undefined,
      remove: () => Promise.resolve(),
      act: (r: ReturnType<typeof useEntityImages>) => r.handleDelete(1),
      expectedCalls: 1,
    },
    {
      description: 'a delete fails',
      upload: undefined,
      remove: () => Promise.reject(new Error('network error')),
      act: (r: ReturnType<typeof useEntityImages>) => r.handleDelete(1),
      expectedCalls: 0,
    },
    {
      description: 'no remove function is given',
      upload: undefined,
      remove: undefined,
      act: (r: ReturnType<typeof useEntityImages>) => r.handleDelete(1),
      expectedCalls: 0,
    },
  ])(
    'calls onImagesChanged $expectedCalls time(s) when $description',
    async ({ upload, remove, act: run, expectedCalls }) => {
      const onImagesChanged = vi.fn();
      const { result } = renderHook(() =>
        useEntityImages({
          initialImages: images,
          upload,
          remove,
          onImagesChanged,
        }),
      );

      await act(() => run(result.current));

      expect(onImagesChanged).toHaveBeenCalledTimes(expectedCalls);
    },
  );

  it('propagates upload failures without calling onImagesChanged', async () => {
    const onImagesChanged = vi.fn();
    const upload = vi.fn().mockRejectedValue(new Error('too big'));
    const { result } = renderHook(() =>
      useEntityImages({
        initialImages: [],
        upload,
        remove: undefined,
        onImagesChanged,
      }),
    );

    await act(async () => {
      await expect(
        result.current.handleUpload(new File(['a'], 'a.jpg'), 'A'),
      ).rejects.toThrow('too big');
    });

    expect(onImagesChanged).not.toHaveBeenCalled();
    expect(result.current.images).toEqual([]);
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
