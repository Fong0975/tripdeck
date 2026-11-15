import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useObjectUrls } from './useObjectUrls';

describe('useObjectUrls', () => {
  it.each([
    {
      name: 'revokes every still-live URL on unmount',
      revokeEarly: [] as string[],
      expectedOnUnmount: ['blob:a', 'blob:b'],
    },
    {
      name: 'does not revoke an already-revoked URL again on unmount',
      revokeEarly: ['blob:a'],
      expectedOnUnmount: ['blob:b'],
    },
  ])('$name', ({ revokeEarly, expectedOnUnmount }) => {
    vi.mocked(URL.createObjectURL)
      .mockReturnValueOnce('blob:a')
      .mockReturnValueOnce('blob:b');
    const { result, unmount } = renderHook(() => useObjectUrls());

    expect(result.current.create(new Blob(['a']))).toBe('blob:a');
    expect(result.current.create(new Blob(['b']))).toBe('blob:b');
    revokeEarly.forEach(url => result.current.revoke(url));
    vi.mocked(URL.revokeObjectURL).mockClear();

    unmount();

    expect(vi.mocked(URL.revokeObjectURL).mock.calls.flat()).toEqual(
      expectedOnUnmount,
    );
  });

  it('revokes a URL immediately when asked', () => {
    const { result } = renderHook(() => useObjectUrls());
    const url = result.current.create(new Blob(['a']));

    result.current.revoke(url);

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
  });
});
