import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  makeChecklistCategory,
  makeChecklistItem,
  makeTripChecklist,
} from '@/test-utils/fixtures';
import type { TripChecklist } from '@/types';

import { useChecklistState } from './useChecklistState';

import TripChecklistPanel from './index';

vi.mock('./useChecklistState', () => ({ useChecklistState: vi.fn() }));

vi.mock('./ChecklistTable', () => ({
  default: ({
    checklist,
    viewMode,
    hidden,
    isUnitVisible,
  }: {
    checklist: TripChecklist;
    viewMode: string;
    hidden: ReadonlySet<string>;
    isUnitVisible?: unknown;
  }) => (
    <div>
      checklist-table-{checklist.categories.length}-{viewMode}-{hidden.size}
      {isUnitVisible ? '-unfinished' : ''}
    </div>
  ),
}));

vi.mock('../Checklist/trip/CheckSaveBar', () => ({
  default: ({
    saving,
    onSave,
    onDiscard,
  }: {
    saving: boolean;
    onSave: () => void;
    onDiscard: () => void;
  }) => (
    <div>
      <span>saving:{String(saving)}</span>
      <button onClick={onSave}>save-bar</button>
      <button onClick={onDiscard}>discard-bar</button>
    </div>
  ),
}));

vi.mock('../Checklist/trip/TripChecklistEditModal', () => ({
  default: ({
    onClose,
    onSaved,
  }: {
    onClose: () => void;
    onSaved: () => void;
  }) => (
    <div>
      <span>edit-modal</span>
      <button onClick={onClose}>close-edit-modal</button>
      <button onClick={onSaved}>save-edit-modal</button>
    </div>
  ),
}));

function makeChecklist(
  categories: TripChecklist['categories'] = [
    makeChecklistCategory({
      name: 'Cat A',
      items: [makeChecklistItem({ id: 10, name: 'Item A' })],
    }),
  ],
): TripChecklist {
  return makeTripChecklist({ categories });
}

function makeState(
  overrides: Partial<ReturnType<typeof useChecklistState>> = {},
): ReturnType<typeof useChecklistState> {
  return {
    checklist: makeChecklist(),
    loading: false,
    loadError: false,
    retryLoad: vi.fn(),
    saving: false,
    isDirty: false,
    getCheck: vi.fn(),
    getSpecCheck: vi.fn(),
    handleToggleCheck: vi.fn(),
    handleToggleSpecCheck: vi.fn(),
    handleSaveChecks: vi.fn(),
    handleDiscardChecks: vi.fn(),
    handleEditSaved: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(useChecklistState).mockReturnValue(makeState());
});

describe('TripChecklistPanel', () => {
  it('shows the loading indicator while loading', () => {
    vi.mocked(useChecklistState).mockReturnValue(
      makeState({ loading: true, checklist: null }),
    );

    render(<TripChecklistPanel tripId={1} />);

    expect(screen.getByText('載入中…')).toBeInTheDocument();
  });

  it('shows an error with a retry button instead of the spinner when loading failed', async () => {
    const retryLoad = vi.fn();
    vi.mocked(useChecklistState).mockReturnValue(
      makeState({ loadError: true, checklist: null, retryLoad }),
    );
    const user = userEvent.setup();
    render(<TripChecklistPanel tripId={1} />);

    expect(
      screen.getByText('載入行李清單失敗，請稍後再試'),
    ).toBeInTheDocument();
    expect(screen.queryByText('載入中…')).not.toBeInTheDocument();

    await user.click(screen.getByText('重試'));

    expect(retryLoad).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state when there are no categories and opens and closes the edit modal from it', async () => {
    vi.mocked(useChecklistState).mockReturnValue(
      makeState({ checklist: makeChecklist([]) }),
    );
    const user = userEvent.setup();
    render(<TripChecklistPanel tripId={1} />);

    expect(
      screen.getByText(
        '尚未有任何分類，請點擊「編輯清單」以開始建立行李清單。',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByText('編輯清單'));
    expect(screen.getByText('edit-modal')).toBeInTheDocument();

    await user.click(screen.getByText('close-edit-modal'));
    expect(screen.queryByText('edit-modal')).not.toBeInTheDocument();
  });

  it('calls handleEditSaved when the edit modal reports saved from the empty state', async () => {
    const handleEditSaved = vi.fn();
    vi.mocked(useChecklistState).mockReturnValue(
      makeState({ checklist: makeChecklist([]), handleEditSaved }),
    );
    const user = userEvent.setup();
    render(<TripChecklistPanel tripId={1} />);
    await user.click(screen.getByText('編輯清單'));

    await user.click(screen.getByText('save-edit-modal'));

    expect(handleEditSaved).toHaveBeenCalledTimes(1);
  });

  it('shows the total item count and the checklist table', () => {
    render(<TripChecklistPanel tripId={1} />);

    expect(screen.getByText('共 1 項')).toBeInTheDocument();
    expect(
      screen.getByText('checklist-table-1-category-0'),
    ).toBeInTheDocument();
  });

  it('switches the table view mode from the view settings', async () => {
    const user = userEvent.setup();
    render(<TripChecklistPanel tripId={1} />);
    await user.click(screen.getByRole('button', { name: /檢視設定/ }));

    await user.click(screen.getByRole('button', { name: '依存放位置' }));
    expect(screen.getByText('checklist-table-1-storage-0')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '依分類' }));
    expect(
      screen.getByText('checklist-table-1-category-0'),
    ).toBeInTheDocument();
  });

  it('hides filtered items from the table without changing the item count', async () => {
    const user = userEvent.setup();
    render(<TripChecklistPanel tripId={1} />);
    await user.click(screen.getByRole('button', { name: /檢視設定/ }));

    await user.click(screen.getByRole('checkbox', { name: 'Item A' }));

    expect(screen.getByText('共 1 項')).toBeInTheDocument();
    expect(screen.getByText('已隱藏 1')).toBeInTheDocument();
  });

  it('shows an empty filter state with a clear button when every item is hidden', async () => {
    const user = userEvent.setup();
    render(<TripChecklistPanel tripId={1} />);
    await user.click(screen.getByRole('button', { name: /檢視設定/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Item A' }));

    expect(screen.getByText('沒有符合篩選的項目')).toBeInTheDocument();
    expect(screen.queryByText(/^checklist-table-/)).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: '清除篩選' }));

    expect(screen.queryByText('沒有符合篩選的項目')).not.toBeInTheDocument();
    expect(
      screen.getByText('checklist-table-1-category-0'),
    ).toBeInTheDocument();
  });

  it('resets the filter when the view mode changes', async () => {
    const user = userEvent.setup();
    render(<TripChecklistPanel tripId={1} />);
    await user.click(screen.getByRole('button', { name: /檢視設定/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Item A' }));
    expect(screen.getByText('已隱藏 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '依存放位置' }));

    expect(screen.queryByText(/已隱藏/)).not.toBeInTheDocument();
  });

  it.each([
    { description: 'the checklist is dirty', isDirty: true, expected: true },
    {
      description: 'the checklist is not dirty',
      isDirty: false,
      expected: false,
    },
  ])('shows CheckSaveBar only when $description', ({ isDirty, expected }) => {
    vi.mocked(useChecklistState).mockReturnValue(makeState({ isDirty }));

    render(<TripChecklistPanel tripId={1} />);

    expect(screen.queryByText(/^saving:/) !== null).toBe(expected);
  });

  it('calls handleSaveChecks when the save bar is clicked', async () => {
    const handleSaveChecks = vi.fn();
    vi.mocked(useChecklistState).mockReturnValue(
      makeState({ isDirty: true, handleSaveChecks }),
    );
    const user = userEvent.setup();
    render(<TripChecklistPanel tripId={1} />);

    await user.click(screen.getByText('save-bar'));

    expect(handleSaveChecks).toHaveBeenCalledTimes(1);
  });

  it('calls handleDiscardChecks when the discard bar is clicked', async () => {
    const handleDiscardChecks = vi.fn();
    vi.mocked(useChecklistState).mockReturnValue(
      makeState({ isDirty: true, handleDiscardChecks }),
    );
    const user = userEvent.setup();
    render(<TripChecklistPanel tripId={1} />);

    await user.click(screen.getByText('discard-bar'));

    expect(handleDiscardChecks).toHaveBeenCalledTimes(1);
  });

  it('opens and closes the edit modal via the toolbar button', async () => {
    const user = userEvent.setup();
    render(<TripChecklistPanel tripId={1} />);

    await user.click(screen.getByText('編輯清單'));
    expect(screen.getByText('edit-modal')).toBeInTheDocument();

    await user.click(screen.getByText('close-edit-modal'));
    expect(screen.queryByText('edit-modal')).not.toBeInTheDocument();
  });

  it('calls handleEditSaved when the edit modal reports saved', async () => {
    const handleEditSaved = vi.fn();
    vi.mocked(useChecklistState).mockReturnValue(
      makeState({ handleEditSaved }),
    );
    const user = userEvent.setup();
    render(<TripChecklistPanel tripId={1} />);
    await user.click(screen.getByText('編輯清單'));

    await user.click(screen.getByText('save-edit-modal'));

    expect(handleEditSaved).toHaveBeenCalledTimes(1);
  });

  it('passes tripId and onDirtyChange through to useChecklistState', () => {
    const onDirtyChange = vi.fn();

    render(<TripChecklistPanel tripId={7} onDirtyChange={onDirtyChange} />);

    expect(useChecklistState).toHaveBeenCalledWith(7, onDirtyChange);
  });

  it('limits the table to unfinished units and pauses the hidden filter', async () => {
    const user = userEvent.setup();
    render(<TripChecklistPanel tripId={1} />);
    await user.click(screen.getByRole('button', { name: /檢視設定/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Item A' }));
    expect(screen.getByText('沒有符合篩選的項目')).toBeInTheDocument();

    await user.click(
      screen.getByRole('checkbox', { name: '僅顯示未完成的項目' }),
    );

    expect(
      screen.getByText('checklist-table-1-category-0-unfinished'),
    ).toBeInTheDocument();
    expect(screen.getByText('僅未完成')).toBeInTheDocument();
  });

  it('shows the all-done state and returns to every item from it', async () => {
    const checked = () => true;
    vi.mocked(useChecklistState).mockReturnValue(
      makeState({
        checklist: makeTripChecklist({
          occasions: [{ id: 1, name: 'Out', checks: {}, specChecks: {} }],
          categories: [
            makeChecklistCategory({
              name: 'Cat A',
              items: [makeChecklistItem({ id: 10, name: 'Item A' })],
            }),
          ],
        }),
        getCheck: checked,
      }),
    );
    const user = userEvent.setup();
    render(<TripChecklistPanel tripId={1} />);
    await user.click(screen.getByRole('button', { name: /檢視設定/ }));

    await user.click(
      screen.getByRole('checkbox', { name: '僅顯示未完成的項目' }),
    );
    await user.keyboard('{Escape}');

    expect(screen.getByText('所有項目都已完成 🎉')).toBeInTheDocument();
    expect(screen.queryByText(/^checklist-table-/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '顯示全部項目' }));

    expect(screen.queryByText('所有項目都已完成 🎉')).not.toBeInTheDocument();
    expect(
      screen.getByText(/^checklist-table-1-category-0/),
    ).toBeInTheDocument();
  });
});
