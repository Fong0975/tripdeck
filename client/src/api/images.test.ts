import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from './client';
import {
  deleteAttractionImage,
  deleteConnectionImage,
  deleteTripImage,
  uploadAttractionImage,
  uploadConnectionImage,
  uploadTripImage,
} from './images';

vi.mock('./client', async importOriginal => {
  const actual = await importOriginal<typeof import('./client')>();
  return { ...actual, api: vi.fn() };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api).mockResolvedValue(undefined);
});

function formDataEntries(form: FormData): Record<string, unknown> {
  return Object.fromEntries(form.entries());
}

describe('uploadAttractionImage', () => {
  it('POSTs a multipart form containing the image and title', async () => {
    const file = new File(['a'], 'a.jpg');

    await uploadAttractionImage(1, 5, file, 'My title');

    expect(api).toHaveBeenCalledWith(
      '/api/trips/1/attractions/5/images',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    );
    const [, init] = vi.mocked(api).mock.calls[0];
    expect(formDataEntries(init?.body as FormData)).toEqual({
      image: file,
      title: 'My title',
    });
  });
});

describe('deleteAttractionImage', () => {
  it('DELETEs the attraction image endpoint', async () => {
    await deleteAttractionImage(1, 5, 9);

    expect(api).toHaveBeenCalledWith('/api/trips/1/attractions/5/images/9', {
      method: 'DELETE',
    });
  });
});

describe('uploadConnectionImage', () => {
  it('POSTs a multipart form containing the image and title', async () => {
    const file = new File(['b'], 'b.jpg');

    await uploadConnectionImage(1, 7, file, 'Connection title');

    expect(api).toHaveBeenCalledWith(
      '/api/trips/1/connections/7/images',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    );
    const [, init] = vi.mocked(api).mock.calls[0];
    expect(formDataEntries(init?.body as FormData)).toEqual({
      image: file,
      title: 'Connection title',
    });
  });
});

describe('deleteConnectionImage', () => {
  it('DELETEs the connection image endpoint', async () => {
    await deleteConnectionImage(1, 7, 9);

    expect(api).toHaveBeenCalledWith('/api/trips/1/connections/7/images/9', {
      method: 'DELETE',
    });
  });
});

describe('uploadTripImage', () => {
  it('POSTs a multipart form containing the image and title', async () => {
    const file = new File(['c'], 'c.jpg');

    await uploadTripImage(1, file, 'Trip title');

    expect(api).toHaveBeenCalledWith(
      '/api/trips/1/images',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    );
    const [, init] = vi.mocked(api).mock.calls[0];
    expect(formDataEntries(init?.body as FormData)).toEqual({
      image: file,
      title: 'Trip title',
    });
  });
});

describe('deleteTripImage', () => {
  it('DELETEs the trip image endpoint', async () => {
    await deleteTripImage(1, 9);

    expect(api).toHaveBeenCalledWith('/api/trips/1/images/9', {
      method: 'DELETE',
    });
  });
});
