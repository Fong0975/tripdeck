import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  makeChecklistCategory,
  makeChecklistItem,
} from '@/test-utils/fixtures';

import CategoryDetail from './CategoryDetail';

describe('CategoryDetail', () => {
  it('shows the category name, item count and one card per item', () => {
    render(
      <CategoryDetail
        category={makeChecklistCategory({
          name: 'Clothes',
          items: [
            makeChecklistItem({ id: 1, name: 'Shirt' }),
            makeChecklistItem({ id: 2, name: 'Pants' }),
          ],
        })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Clothes', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText('共 2 項物品')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('shows the empty hint when the category has no items', () => {
    render(
      <CategoryDetail
        category={makeChecklistCategory({ items: [] })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('尚無項目，點擊「編輯」開始新增。')).toBeVisible();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it.each([
    { label: '編輯', handler: 'onEdit' },
    { label: '刪除', handler: 'onDelete' },
  ] as const)(
    'calls $handler when $label is clicked',
    async ({ label, handler }) => {
      const handlers = { onEdit: vi.fn(), onDelete: vi.fn() };
      const user = userEvent.setup();
      render(
        <CategoryDetail category={makeChecklistCategory()} {...handlers} />,
      );

      await user.click(screen.getByRole('button', { name: label }));

      expect(handlers[handler]).toHaveBeenCalledTimes(1);
    },
  );
});
