import { renderHook, waitFor } from '@testing-library/react';
import type { LocationLabelsResponse } from '@tripdeck/shared';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getLocationLabels } from '@/utils/storage';

import { useLocationLabelSet } from './LocationLabelsContext';
import { LocationLabelsProvider } from './LocationLabelsProvider';

vi.mock('@/utils/storage');

const wrapper = ({ children }: { children: ReactNode }) => (
  <LocationLabelsProvider>{children}</LocationLabelsProvider>
);

const stored: LocationLabelsResponse = {
  labels: [
    { id: 5, name: '手提', show_as_group: false, sort_order: 0 },
    { id: 6, name: '託運', show_as_group: true, sort_order: 1 },
  ],
  orphans: [],
};

beforeEach(() => {
  vi.mocked(getLocationLabels).mockResolvedValue(stored);
});

describe('useLocationLabelSet', () => {
  it('yields the default labels without a provider', () => {
    const { result } = renderHook(() => useLocationLabelSet());

    expect(result.current.names).toEqual(['託運', '隨身']);
    expect(result.current.labels.every(label => label.show_as_group)).toBe(
      true,
    );
  });
});

describe('LocationLabelsProvider', () => {
  it('starts with the default labels, then switches to the loaded ones', async () => {
    const { result } = renderHook(() => useLocationLabelSet(), { wrapper });

    expect(result.current.names).toEqual(['託運', '隨身']);
    await waitFor(() => expect(result.current.names).toEqual(['手提', '託運']));
    expect(result.current.labels).toEqual(stored.labels);
  });

  it('keeps the labels it has when loading fails', async () => {
    vi.mocked(getLocationLabels).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useLocationLabelSet(), { wrapper });

    await waitFor(() => expect(getLocationLabels).toHaveBeenCalled());
    expect(result.current.names).toEqual(['託運', '隨身']);
  });

  it('reloads the labels on demand', async () => {
    const { result } = renderHook(() => useLocationLabelSet(), { wrapper });
    await waitFor(() => expect(result.current.names).toEqual(['手提', '託運']));
    vi.mocked(getLocationLabels).mockResolvedValue({
      ...stored,
      labels: [stored.labels[1]],
    });

    await result.current.reload();

    await waitFor(() => expect(result.current.names).toEqual(['託運']));
  });
});
