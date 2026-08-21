import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChecklistCategory, ChecklistTemplate } from '@/types';
import {
  addTemplateCategory,
  deleteTemplateCategory,
  getChecklistTemplate,
} from '@/utils/storage';

import ChecklistTemplateView from './ChecklistTemplateView';

vi.mock('@/utils/storage', () => ({
  addTemplateCategory: vi.fn(),
  deleteTemplateCategory: vi.fn(),
  getChecklistTemplate: vi.fn(),
}));

vi.mock('./CategoryEditModal', () => ({
  default: ({
    category,
    onClose,
    onSaved,
  }: {
    category: ChecklistCategory;
    onClose: () => void;
    onSaved: () => void;
  }) => (
    <div>
      <span>Editing {category.name}</span>
      <button onClick={onClose}>close-modal</button>
      <button onClick={onSaved}>save-modal</button>
    </div>
  ),
}));

function makeTemplate(
  overrides: Partial<ChecklistTemplate> = {},
): ChecklistTemplate {
  return {
    categories: [
      {
        id: 1,
        name: 'Category A',
        items: [
          {
            id: 10,
            name: 'Item A',
            quantity: 2,
            notes: 'note',
            storage_location: '託運',
            specs: [],
          },
        ],
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getChecklistTemplate).mockResolvedValue(makeTemplate());
  vi.mocked(addTemplateCategory).mockResolvedValue({
    id: 2,
    name: '新分類',
    items: [],
  });
  vi.mocked(deleteTemplateCategory).mockResolvedValue(undefined);
});

describe('ChecklistTemplateView', () => {
  it('shows the loading indicator before the template resolves', () => {
    vi.mocked(getChecklistTemplate).mockReturnValue(new Promise(() => {}));

    render(<ChecklistTemplateView />);

    expect(screen.getByText('載入中…')).toBeInTheDocument();
  });

  it('renders categories with their item counts once loaded', async () => {
    render(<ChecklistTemplateView />);

    expect(await screen.findByText('Category A')).toBeInTheDocument();
    expect(screen.getByText('1 項')).toBeInTheDocument();
  });

  it('shows item details only once the category is expanded', async () => {
    const user = userEvent.setup();
    render(<ChecklistTemplateView />);
    await screen.findByText('Category A');
    expect(screen.queryByText('Item A')).not.toBeInTheDocument();

    await user.click(screen.getByText('Category A'));

    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByText('note')).toBeInTheDocument();
    expect(screen.getByText('託運')).toBeInTheDocument();
  });

  it('opens the edit modal when the pencil button is clicked', async () => {
    const user = userEvent.setup();
    render(<ChecklistTemplateView />);
    await screen.findByText('Category A');

    await user.click(screen.getByLabelText('編輯分類'));

    expect(screen.getByText('Editing Category A')).toBeInTheDocument();
  });

  it('closes the edit modal when its onClose fires', async () => {
    const user = userEvent.setup();
    render(<ChecklistTemplateView />);
    await screen.findByText('Category A');
    await user.click(screen.getByLabelText('編輯分類'));

    await user.click(screen.getByText('close-modal'));

    expect(screen.queryByText('Editing Category A')).not.toBeInTheDocument();
  });

  it('reloads the template when the edit modal saves', async () => {
    const user = userEvent.setup();
    render(<ChecklistTemplateView />);
    await screen.findByText('Category A');
    vi.mocked(getChecklistTemplate).mockClear();
    await user.click(screen.getByLabelText('編輯分類'));

    await user.click(screen.getByText('save-modal'));

    await waitFor(() => expect(getChecklistTemplate).toHaveBeenCalledTimes(1));
  });

  it('calls deleteTemplateCategory and reloads when the trash button is clicked', async () => {
    const user = userEvent.setup();
    render(<ChecklistTemplateView />);
    await screen.findByText('Category A');
    vi.mocked(getChecklistTemplate).mockClear();

    await user.click(screen.getByLabelText('刪除分類'));

    await waitFor(() => expect(deleteTemplateCategory).toHaveBeenCalledWith(1));
    await waitFor(() => expect(getChecklistTemplate).toHaveBeenCalledTimes(1));
  });

  it('shows the empty items message when a category has no items', async () => {
    vi.mocked(getChecklistTemplate).mockResolvedValue(
      makeTemplate({
        categories: [{ id: 1, name: 'Category A', items: [] }],
      }),
    );
    const user = userEvent.setup();
    render(<ChecklistTemplateView />);
    await screen.findByText('Category A');

    await user.click(screen.getByText('Category A'));

    expect(screen.getByText('尚無項目')).toBeInTheDocument();
  });

  it('falls back to 些許 when an item has no quantity', async () => {
    vi.mocked(getChecklistTemplate).mockResolvedValue(
      makeTemplate({
        categories: [
          {
            id: 1,
            name: 'Category A',
            items: [{ id: 10, name: 'Item A' }],
          },
        ],
      }),
    );
    const user = userEvent.setup();
    render(<ChecklistTemplateView />);
    await screen.findByText('Category A');

    await user.click(screen.getByText('Category A'));

    expect(screen.getByText('些許')).toBeInTheDocument();
  });

  it('renders spec entries with numbering when an item has specs', async () => {
    vi.mocked(getChecklistTemplate).mockResolvedValue(
      makeTemplate({
        categories: [
          {
            id: 1,
            name: 'Category A',
            items: [
              {
                id: 10,
                name: 'Item A',
                specs: [
                  { id: 100, name: 'Spec A', storage_location: null },
                  { id: 101, name: 'Spec B', storage_location: null },
                ],
              },
            ],
          },
        ],
      }),
    );
    const user = userEvent.setup();
    render(<ChecklistTemplateView />);
    await screen.findByText('Category A');

    await user.click(screen.getByText('Category A'));

    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('Spec A')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByText('Spec B')).toBeInTheDocument();
  });

  it('shows a spec-level storage location badge when a spec has one', async () => {
    vi.mocked(getChecklistTemplate).mockResolvedValue(
      makeTemplate({
        categories: [
          {
            id: 1,
            name: 'Category A',
            items: [
              {
                id: 10,
                name: 'Item A',
                specs: [{ id: 100, name: 'Spec A', storage_location: '託運' }],
              },
            ],
          },
        ],
      }),
    );
    const user = userEvent.setup();
    render(<ChecklistTemplateView />);
    await screen.findByText('Category A');

    await user.click(screen.getByText('Category A'));

    expect(screen.getByText('Spec A')).toBeInTheDocument();
    expect(screen.getByText('託運')).toBeInTheDocument();
  });

  it('calls addTemplateCategory and reloads when 新增分類 is clicked', async () => {
    const user = userEvent.setup();
    render(<ChecklistTemplateView />);
    await screen.findByText('Category A');
    vi.mocked(getChecklistTemplate).mockClear();

    await user.click(screen.getByText('新增分類'));

    await waitFor(() =>
      expect(addTemplateCategory).toHaveBeenCalledWith('新分類'),
    );
    await waitFor(() => expect(getChecklistTemplate).toHaveBeenCalledTimes(1));
  });
});
