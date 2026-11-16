import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CategorySidebar from './CategorySidebar';

const categories = [
  { id: 1, name: 'Clothes', count: 2 },
  { id: 2, name: 'Toiletries', count: 0 },
];

describe('CategorySidebar', () => {
  it('lists every category with its item count', () => {
    render(
      <CategorySidebar
        categories={categories}
        selectedId={1}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Clothes/ })).toHaveTextContent(
      '2',
    );
    expect(
      screen.getByRole('button', { name: /Toiletries/ }),
    ).toHaveTextContent('0');
  });

  it.each([
    { selectedId: 1, current: /Clothes/, other: /Toiletries/ },
    { selectedId: 2, current: /Toiletries/, other: /Clothes/ },
    { selectedId: null, current: null, other: /Clothes/ },
  ])(
    'marks only the selected category as current (selectedId=$selectedId)',
    ({ selectedId, current, other }) => {
      render(
        <CategorySidebar
          categories={categories}
          selectedId={selectedId}
          onSelect={vi.fn()}
          onAdd={vi.fn()}
        />,
      );

      if (current) {
        expect(screen.getByRole('button', { name: current })).toHaveAttribute(
          'aria-current',
          'true',
        );
      }
      expect(screen.getByRole('button', { name: other })).not.toHaveAttribute(
        'aria-current',
      );
    },
  );

  it('calls onSelect with the category id when a category is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <CategorySidebar
        categories={categories}
        selectedId={1}
        onSelect={onSelect}
        onAdd={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Toiletries/ }));

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('calls onAdd when 新增分類 is clicked', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(
      <CategorySidebar
        categories={[]}
        selectedId={null}
        onSelect={vi.fn()}
        onAdd={onAdd}
      />,
    );

    await user.click(screen.getByRole('button', { name: '新增分類' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
