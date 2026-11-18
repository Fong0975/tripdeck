import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeTripChecklist } from '@/test-utils/fixtures';
import { getBackdrop } from '@/test-utils/queries';

import { useEditState } from './useEditState';
import { useSaveChecklist } from './useSaveChecklist';

import TripChecklistEditModal from './index';

vi.mock('./useEditState', () => ({ useEditState: vi.fn() }));
vi.mock('./useSaveChecklist', () => ({ useSaveChecklist: vi.fn() }));
vi.mock('./CategoryEditPane', () => ({
  default: ({ category }: { category: { name: string } }) => (
    <div>category-edit-pane:{category.name}</div>
  ),
}));
vi.mock('../../shared/CategorySidebar', () => ({
  default: ({
    categories,
    selectedId,
    onSelect,
    onAdd,
  }: {
    categories: { id: number; name: string; count: number }[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    onAdd: () => void;
  }) => (
    <div>
      <span>sidebar-selected:{String(selectedId)}</span>
      {categories.map(c => (
        <button key={c.id} onClick={() => onSelect(c.id)}>
          sidebar-{c.name}-{c.count}
        </button>
      ))}
      <button onClick={onAdd}>sidebar-add</button>
    </div>
  ),
}));
vi.mock('./OccasionEditList', () => ({
  default: () => <div>occasion-edit-list</div>,
}));

const checklist = makeTripChecklist();

function mockEditState(
  overrides: Partial<ReturnType<typeof useEditState>> = {},
) {
  vi.mocked(useEditState).mockReturnValue({
    edit: { occasions: [], categories: [] },
    isDirty: false,
    scrollBodyRef: { current: null },
    visibleOccasions: [],
    visibleCategories: [],
    selectedCategory: null,
    selectCategory: vi.fn(),
    addOccasionLocal: vi.fn(),
    updateOccasionName: vi.fn(),
    removeOccasion: vi.fn(),
    addCategoryLocal: vi.fn(),
    updateCategoryName: vi.fn(),
    removeCategory: vi.fn(),
    reorderCategories: vi.fn(),
    reorderItems: vi.fn(),
    moveItem: vi.fn(),
    addItemLocal: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    addSpecLocal: vi.fn(),
    updateSpec: vi.fn(),
    removeSpec: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  mockEditState();
});

describe('TripChecklistEditModal', () => {
  it('renders the header title, the occasion list and the empty hint without categories', () => {
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
    expect(
      screen.getByText('尚無分類，請先新增一個分類。'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/category-edit-pane/)).not.toBeInTheDocument();
  });

  it('shows the selected category in the pane and wires the sidebar handlers', async () => {
    vi.mocked(useSaveChecklist).mockReturnValue({
      saving: false,
      handleSave: vi.fn(),
    });
    const selectCategory = vi.fn();
    const addCategoryLocal = vi.fn();
    const visibleCategories = [
      {
        id: 1,
        name: 'Clothes',
        items: [{ id: 10, _deleted: true }, { id: 11 }],
      },
      { id: 2, name: 'Toiletries', items: [] },
    ] as unknown as ReturnType<typeof useEditState>['visibleCategories'];
    mockEditState({
      visibleCategories,
      selectedCategory: visibleCategories[0],
      selectCategory,
      addCategoryLocal,
    });
    const user = userEvent.setup();
    render(
      <TripChecklistEditModal
        tripId={1}
        checklist={checklist}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByText('category-edit-pane:Clothes')).toBeInTheDocument();
    expect(screen.getByText('sidebar-selected:1')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'sidebar-Clothes-1' }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'sidebar-Toiletries-0' }),
    );
    await user.click(screen.getByRole('button', { name: 'sidebar-add' }));

    expect(selectCategory).toHaveBeenCalledWith(2);
    expect(addCategoryLocal).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      description: 'the header close button',
      trigger: () => screen.getByLabelText('關閉'),
    },
    {
      description: 'the cancel button',
      trigger: () => screen.getByText('取消'),
    },
    {
      description: 'the backdrop',
      trigger: (container: HTMLElement) => getBackdrop(container),
    },
  ])('calls onClose when $description is clicked', async ({ trigger }) => {
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

    await user.click(trigger(container));

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

  it.each([
    {
      description: 'the header close button',
      trigger: () => fireEvent.click(screen.getByLabelText('關閉')),
    },
    {
      description: 'the cancel button',
      trigger: () => fireEvent.click(screen.getByText('取消')),
    },
    {
      description: 'the backdrop',
      trigger: (container: HTMLElement) =>
        fireEvent.click(getBackdrop(container)),
    },
    {
      description: 'Escape',
      trigger: () => fireEvent.keyDown(window, { key: 'Escape' }),
    },
  ])(
    'asks before discarding edits via $description when dirty',
    ({ trigger }) => {
      vi.mocked(useSaveChecklist).mockReturnValue({
        saving: false,
        handleSave: vi.fn(),
      });
      mockEditState({ isDirty: true });
      const onClose = vi.fn();
      const { container } = render(
        <TripChecklistEditModal
          tripId={1}
          checklist={checklist}
          onClose={onClose}
          onSaved={vi.fn()}
        />,
      );

      trigger(container);

      expect(onClose).not.toHaveBeenCalled();
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAccessibleName('確定要關閉嗎？');
      expect(
        within(dialog).getByText('尚未儲存的變更將會遺失。'),
      ).toBeInTheDocument();
    },
  );

  it.each([
    { button: '確定', expectedCloses: 1 },
    { button: '取消', expectedCloses: 0 },
  ])(
    'clicking $button in the discard confirmation closes $expectedCloses time(s) and dismisses it',
    ({ button, expectedCloses }) => {
      vi.mocked(useSaveChecklist).mockReturnValue({
        saving: false,
        handleSave: vi.fn(),
      });
      mockEditState({ isDirty: true });
      const onClose = vi.fn();
      render(
        <TripChecklistEditModal
          tripId={1}
          checklist={checklist}
          onClose={onClose}
          onSaved={vi.fn()}
        />,
      );
      fireEvent.keyDown(window, { key: 'Escape' });

      const dialog = screen.getByRole('alertdialog');
      fireEvent.click(within(dialog).getByRole('button', { name: button }));

      expect(onClose).toHaveBeenCalledTimes(expectedCloses);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    },
  );

  it('cancels only the discard confirmation when Escape is pressed again', () => {
    vi.mocked(useSaveChecklist).mockReturnValue({
      saving: false,
      handleSave: vi.fn(),
    });
    mockEditState({ isDirty: true });
    const onClose = vi.fn();
    render(
      <TripChecklistEditModal
        tripId={1}
        checklist={checklist}
        onClose={onClose}
        onSaved={vi.fn()}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByText('儲存')).toBeInTheDocument();
  });
});

vi.mock('../../locations/LocationLabelsModal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div>
      <span>location-labels-modal</span>
      <button onClick={onClose}>close-location-labels</button>
    </div>
  ),
}));

describe('TripChecklistEditModal location label management', () => {
  it('opens the location label manager from the header and closes it again', async () => {
    mockEditState();
    vi.mocked(useSaveChecklist).mockReturnValue({
      saving: false,
      handleSave: vi.fn(),
    });
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <TripChecklistEditModal
        tripId={1}
        checklist={checklist}
        onClose={onClose}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.queryByText('location-labels-modal')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '管理位置' }));
    expect(screen.getByText('location-labels-modal')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'close-location-labels' }),
    );
    expect(screen.queryByText('location-labels-modal')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
