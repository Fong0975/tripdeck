import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ChecklistCategory } from '@/types';

import CategoryCard from './CategoryCard';

function makeCategory(
  overrides: Partial<ChecklistCategory> = {},
): ChecklistCategory {
  return {
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
    ...overrides,
  };
}

describe('CategoryCard', () => {
  it('renders the category name and item count', () => {
    render(
      <CategoryCard
        category={makeCategory()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Category A')).toBeInTheDocument();
    expect(screen.getByText('1 項')).toBeInTheDocument();
  });

  it('shows item details only once the category is expanded', async () => {
    const user = userEvent.setup();
    render(
      <CategoryCard
        category={makeCategory()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByText('Item A')).not.toBeInTheDocument();

    await user.click(screen.getByText('Category A'));

    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByText('note')).toBeInTheDocument();
    expect(screen.getByText('託運')).toBeInTheDocument();
  });

  it('calls onEdit when the pencil button is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <CategoryCard
        category={makeCategory()}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText('編輯分類'));

    expect(onEdit).toHaveBeenCalled();
  });

  it('calls onDelete when the trash button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <CategoryCard
        category={makeCategory()}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByLabelText('刪除分類'));

    expect(onDelete).toHaveBeenCalled();
  });

  it('shows the empty items message when a category has no items', async () => {
    const user = userEvent.setup();
    render(
      <CategoryCard
        category={makeCategory({ items: [] })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByText('Category A'));

    expect(screen.getByText('尚無項目')).toBeInTheDocument();
  });

  it('falls back to 些許 when an item has no quantity', async () => {
    const user = userEvent.setup();
    render(
      <CategoryCard
        category={makeCategory({ items: [{ id: 10, name: 'Item A' }] })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    await user.click(screen.getByText('Category A'));

    expect(screen.getByText('些許')).toBeInTheDocument();
  });

  it('renders spec entries with numbering when an item has specs', async () => {
    const user = userEvent.setup();
    render(
      <CategoryCard
        category={makeCategory({
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
        })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    await user.click(screen.getByText('Category A'));

    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('Spec A')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByText('Spec B')).toBeInTheDocument();
  });

  it('shows a spec-level storage location badge when a spec has one', async () => {
    const user = userEvent.setup();
    render(
      <CategoryCard
        category={makeCategory({
          items: [
            {
              id: 10,
              name: 'Item A',
              specs: [{ id: 100, name: 'Spec A', storage_location: '託運' }],
            },
          ],
        })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    await user.click(screen.getByText('Category A'));

    expect(screen.getByText('Spec A')).toBeInTheDocument();
    expect(screen.getByText('託運')).toBeInTheDocument();
  });
});
