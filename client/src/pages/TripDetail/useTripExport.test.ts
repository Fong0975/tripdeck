import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { showToast } from '@/components/ui/toast';
import { makeBoardDays, makeContent, makeTrip } from '@/test-utils/fixtures';
import { exportToDocx } from '@/utils/exportToDocx';

import { useTripExport } from './useTripExport';

vi.mock('@/utils/exportToDocx', () => ({ exportToDocx: vi.fn() }));
vi.mock('@/components/ui/toast');

const trip = makeTrip();
const content = makeContent(makeBoardDays());

beforeEach(() => {
  vi.mocked(exportToDocx).mockResolvedValue(undefined);
});

describe('useTripExport', () => {
  it.each([
    { description: 'trip is null', trip: null, content },
    { description: 'content is null', trip, content: null },
  ])('does nothing when $description', async args => {
    const { result } = renderHook(() => useTripExport(args.trip, args.content));

    await act(() => result.current.handleExport());

    expect(exportToDocx).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
    expect(result.current.exporting).toBe(false);
  });

  it.each([
    {
      description: 'shows a success toast when the export succeeds',
      fails: false,
      toast: ['success', '已匯出 Word 文件。'],
    },
    {
      description: 'shows an error toast when the export fails',
      fails: true,
      toast: ['error', '匯出 Word 文件失敗，請稍後再試'],
    },
  ])('$description and resets exporting', async ({ fails, toast }) => {
    if (fails) {
      vi.mocked(exportToDocx).mockRejectedValue(new Error('export failed'));
    }
    const { result } = renderHook(() => useTripExport(trip, content));

    await act(() => result.current.handleExport());

    expect(exportToDocx).toHaveBeenCalledWith(trip, content);
    expect(showToast).toHaveBeenCalledWith(...toast);
    expect(result.current.exporting).toBe(false);
  });

  it('tracks exporting while running and ignores triggers meanwhile', async () => {
    let resolveExport!: () => void;
    const exportPromise = new Promise<void>(resolve => {
      resolveExport = resolve;
    });
    vi.mocked(exportToDocx).mockReturnValue(exportPromise);
    const { result } = renderHook(() => useTripExport(trip, content));

    let firstExport!: Promise<void>;
    act(() => {
      firstExport = result.current.handleExport();
    });
    await vi.waitFor(() => expect(exportToDocx).toHaveBeenCalledTimes(1));
    expect(result.current.exporting).toBe(true);

    await act(() => result.current.handleExport());
    expect(exportToDocx).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveExport();
      await firstExport;
    });
    expect(result.current.exporting).toBe(false);
  });
});
