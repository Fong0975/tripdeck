import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadBlob } from './download';

describe('downloadBlob', () => {
  let createObjectURL: ReturnType<typeof vi.spyOn>;
  let revokeObjectURL: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:http://localhost/mock-id');
    revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an object URL for the blob and revokes it afterward', () => {
    const blob = new Blob(['data']);

    downloadBlob(blob, 'trip.docx');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(revokeObjectURL).toHaveBeenCalledWith(
      'blob:http://localhost/mock-id',
    );
  });

  it('creates a temporary anchor with the given filename and clicks it', () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    downloadBlob(new Blob(['data']), 'trip.docx');

    const appendedLink = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(appendedLink.download).toBe('trip.docx');
    expect(appendedLink.href).toBe('blob:http://localhost/mock-id');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith(appendedLink);
  });
});
