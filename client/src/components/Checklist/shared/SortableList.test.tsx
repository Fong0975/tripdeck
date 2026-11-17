import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SortableList from './SortableList';
import SortableRow from './SortableRow';

describe('SortableList', () => {
  it.each(['vertical', 'rect'] as const)(
    'renders each row with its own drag handle in the %s layout',
    layout => {
      render(
        <SortableList ids={[1, 2]} onReorder={vi.fn()} layout={layout}>
          {[1, 2].map(id => (
            <SortableRow key={id} id={id}>
              {handle => (
                <div>
                  <span>row-{id}</span>
                  {handle}
                </div>
              )}
            </SortableRow>
          ))}
        </SortableList>,
      );

      expect(screen.getByText('row-1')).toBeInTheDocument();
      expect(screen.getByText('row-2')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: '拖曳排序' })).toHaveLength(
        2,
      );
    },
  );
});
