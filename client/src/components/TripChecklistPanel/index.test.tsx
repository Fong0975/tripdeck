import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TripChecklist } from '@/types';

import { useChecklistState } from './useChecklistState';

import TripChecklistPanel from './index';

vi.mock('./useChecklistState', () => ({ useChecklistState: vi.fn() }));

vi.mock('./ChecklistTable', () => ({
  default: ({ totalItems }: { totalItems: number }) => (
    <div>checklist-table-{totalItems}</div>
  ),
}));

vi.mock('../checklist/trip/CheckSaveBar', () => ({
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

vi.mock('../checklist/trip/TripChecklistEditModal', () => ({
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
    { id: 1, name: 'Cat A', items: [{ id: 10, name: 'Item A' }] },
  ],
): TripChecklist {
  return { tripId: 1, occasions: [], categories };
}

function makeState(
  overrides: Partial<ReturnType<typeof useChecklistState>> = {},
): ReturnType<typeof useChecklistState> {
  return {
    checklist: makeChecklist(),
    loading: false,
    saving: false,
    isDirty: false,
    getCheck: vi.fn(),
    handleToggleCheck: vi.fn(),
    handleSaveChecks: vi.fn(),
    handleDiscardChecks: vi.fn(),
    handleEditSaved: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
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

  it('shows the empty state when there are no categories', () => {
    vi.mocked(useChecklistState).mockReturnValue(
      makeState({ checklist: makeChecklist([]) }),
    );

    render(<TripChecklistPanel tripId={1} />);

    expect(
      screen.getByText(
        '尚未有任何分類，請點擊「編輯清單」以開始建立行李清單。',
      ),
    ).toBeInTheDocument();
  });

  it('opens the edit modal from the empty state', async () => {
    vi.mocked(useChecklistState).mockReturnValue(
      makeState({ checklist: makeChecklist([]) }),
    );
    const user = userEvent.setup();
    render(<TripChecklistPanel tripId={1} />);

    await user.click(screen.getByText('編輯清單'));

    expect(screen.getByText('edit-modal')).toBeInTheDocument();
  });

  it('closes the edit modal from the empty state', async () => {
    vi.mocked(useChecklistState).mockReturnValue(
      makeState({ checklist: makeChecklist([]) }),
    );
    const user = userEvent.setup();
    render(<TripChecklistPanel tripId={1} />);
    await user.click(screen.getByText('編輯清單'));

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
    expect(screen.getByText('checklist-table-1')).toBeInTheDocument();
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
});
