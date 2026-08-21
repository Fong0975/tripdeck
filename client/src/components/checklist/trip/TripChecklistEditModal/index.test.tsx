import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TripChecklist } from '@/types';

import { useEditState } from './useEditState';
import { useSaveChecklist } from './useSaveChecklist';

import TripChecklistEditModal from './index';

vi.mock('./useEditState', () => ({ useEditState: vi.fn() }));
vi.mock('./useSaveChecklist', () => ({ useSaveChecklist: vi.fn() }));
vi.mock('./CategoryEditList', () => ({
  default: () => <div>category-edit-list</div>,
}));
vi.mock('./OccasionEditList', () => ({
  default: () => <div>occasion-edit-list</div>,
}));

const checklist: TripChecklist = { tripId: 1, categories: [], occasions: [] };

function mockEditState() {
  vi.mocked(useEditState).mockReturnValue({
    edit: { occasions: [], categories: [] },
    expandedCats: new Set(),
    scrollBodyRef: { current: null },
    visibleOccasions: [],
    visibleCategories: [],
    addOccasionLocal: vi.fn(),
    updateOccasionName: vi.fn(),
    removeOccasion: vi.fn(),
    addCategoryLocal: vi.fn(),
    updateCategoryName: vi.fn(),
    removeCategory: vi.fn(),
    toggleCatExpanded: vi.fn(),
    addItemLocal: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    addSpecLocal: vi.fn(),
    updateSpec: vi.fn(),
    removeSpec: vi.fn(),
  });
}

// The modal backdrop is a bare decorative div with no accessible role/name;
// 'absolute' uniquely identifies it (the modal wrapper itself uses 'fixed').
function getBackdrop(container: HTMLElement): HTMLElement {
  // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
  return container.querySelector('.absolute') as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEditState();
});

describe('TripChecklistEditModal', () => {
  it('renders the header title and both edit lists', () => {
    vi.mocked(useSaveChecklist).mockReturnValue({
      saving: false,
      handleSave: vi.fn(),
    });

    render(
      <TripChecklistEditModal
        tripId={1}
        checklist={checklist}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByText('編輯行李清單')).toBeInTheDocument();
    expect(screen.getByText('occasion-edit-list')).toBeInTheDocument();
    expect(screen.getByText('category-edit-list')).toBeInTheDocument();
  });

  it('calls onClose when the header close button is clicked', async () => {
    vi.mocked(useSaveChecklist).mockReturnValue({
      saving: false,
      handleSave: vi.fn(),
    });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <TripChecklistEditModal
        tripId={1}
        checklist={checklist}
        onClose={onClose}
        onSaved={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText('關閉'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the cancel button is clicked', async () => {
    vi.mocked(useSaveChecklist).mockReturnValue({
      saving: false,
      handleSave: vi.fn(),
    });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <TripChecklistEditModal
        tripId={1}
        checklist={checklist}
        onClose={onClose}
        onSaved={vi.fn()}
      />,
    );

    await user.click(screen.getByText('取消'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', async () => {
    vi.mocked(useSaveChecklist).mockReturnValue({
      saving: false,
      handleSave: vi.fn(),
    });
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <TripChecklistEditModal
        tripId={1}
        checklist={checklist}
        onClose={onClose}
        onSaved={vi.fn()}
      />,
    );

    await user.click(getBackdrop(container));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls handleSave when the save button is clicked', async () => {
    const handleSave = vi.fn();
    vi.mocked(useSaveChecklist).mockReturnValue({ saving: false, handleSave });
    const user = userEvent.setup();
    render(
      <TripChecklistEditModal
        tripId={1}
        checklist={checklist}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.click(screen.getByText('儲存'));

    expect(handleSave).toHaveBeenCalledTimes(1);
  });

  it('shows a disabled saving state while saving is in progress', () => {
    vi.mocked(useSaveChecklist).mockReturnValue({
      saving: true,
      handleSave: vi.fn(),
    });

    render(
      <TripChecklistEditModal
        tripId={1}
        checklist={checklist}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByText('儲存中…')).toBeDisabled();
  });
});
