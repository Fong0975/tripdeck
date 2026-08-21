import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TripChecklist } from '@/types';

import ChecklistTable from './ChecklistTable';

function makeChecklist(overrides: Partial<TripChecklist> = {}): TripChecklist {
  return {
    tripId: 1,
    occasions: [
      { id: 1, name: 'Occ A', checks: {} },
      { id: 2, name: 'Occ B', checks: {} },
    ],
    categories: [
      {
        id: 1,
        name: 'Category A',
        items: [
          { id: 10, name: 'Item A' },
          { id: 20, name: 'Item B' },
        ],
      },
    ],
    ...overrides,
  };
}

describe('ChecklistTable', () => {
  it('renders the "項目" header and every occasion name', () => {
    render(
      <ChecklistTable
        checklist={makeChecklist()}
        totalItems={2}
        getCheck={() => false}
        onToggleCheck={vi.fn()}
      />,
    );

    expect(screen.getByText('項目')).toBeInTheDocument();
    expect(screen.getByText('Occ A')).toBeInTheDocument();
    expect(screen.getByText('Occ B')).toBeInTheDocument();
  });

  it('shows the checked/total count per occasion based on getCheck', () => {
    render(
      <ChecklistTable
        checklist={makeChecklist()}
        totalItems={2}
        getCheck={(occId, itemId) => occId === 1 && itemId === 10}
        onToggleCheck={vi.fn()}
      />,
    );

    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('0 / 2')).toBeInTheDocument();
  });

  it('does not divide by zero when totalItems is 0', () => {
    render(
      <ChecklistTable
        checklist={makeChecklist({ categories: [] })}
        totalItems={0}
        getCheck={() => false}
        onToggleCheck={vi.fn()}
      />,
    );

    expect(screen.getAllByText('0 / 0')).toHaveLength(2);
  });

  it('renders the category name and every item within it', () => {
    render(
      <ChecklistTable
        checklist={makeChecklist()}
        totalItems={2}
        getCheck={() => false}
        onToggleCheck={vi.fn()}
      />,
    );

    expect(screen.getByText('Category A')).toBeInTheDocument();
    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByText('Item B')).toBeInTheDocument();
  });
});
