import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeChecklistItem, makeChecklistSpec } from '@/test-utils/fixtures';

import ItemCard from './ItemCard';

/** Counts the badges of a location outside the specs list, i.e. the item's own. */
function countItemBadges(location: string): number {
  const specList = screen.queryByRole('list', { name: '規格' });
  const inSpecs = specList
    ? within(specList).queryAllByText(location).length
    : 0;
  return screen.queryAllByText(location).length - inSpecs;
}

describe('ItemCard', () => {
  it.each([
    { description: 'a quantity', quantity: 3, expected: '× 3' },
    { description: 'no quantity', quantity: null, expected: '些許' },
  ])('shows the quantity label for $description', ({ quantity, expected }) => {
    render(
      <ul>
        <ItemCard item={makeChecklistItem({ name: 'Socks', quantity })} />
      </ul>,
    );

    expect(
      screen.getByRole('heading', { name: 'Socks', level: 4 }),
    ).toBeInTheDocument();
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it.each([
    { description: 'notes are set', notes: 'Wash first', count: 1 },
    { description: 'notes are empty', notes: null, count: 0 },
  ])('renders notes only when $description', ({ notes, count }) => {
    render(
      <ul>
        <ItemCard item={makeChecklistItem({ notes })} />
      </ul>,
    );

    expect(screen.queryAllByText('Wash first')).toHaveLength(count);
  });

  it('shows storage badges when the item has a storage location', () => {
    render(
      <ul>
        <ItemCard item={makeChecklistItem({ storage_location: '託運' })} />
      </ul>,
    );

    expect(screen.getByText('託運')).toBeInTheDocument();
  });

  it.each([
    {
      description: 'the union of the spec locations, not the item own',
      itemLocation: '託運',
      specLocations: ['隨身', null],
      shown: ['隨身'],
      hidden: ['託運'],
    },
    {
      description: 'both locations when the specs cover them',
      itemLocation: null,
      specLocations: ['託運', '隨身'],
      shown: ['託運', '隨身'],
      hidden: [],
    },
  ])(
    'shows $description on an item with specs',
    ({ itemLocation, specLocations, shown, hidden }) => {
      render(
        <ul>
          <ItemCard
            item={makeChecklistItem({
              storage_location: itemLocation,
              specs: specLocations.map((storage_location, index) =>
                makeChecklistSpec({
                  id: index + 1,
                  name: `Spec ${index + 1}`,
                  storage_location,
                }),
              ),
            })}
          />
        </ul>,
      );

      for (const location of shown) {
        expect(countItemBadges(location)).toBe(1);
      }
      for (const location of hidden) {
        expect(countItemBadges(location)).toBe(0);
      }
    },
  );

  it('shows no item badge when the specs have no location', () => {
    render(
      <ul>
        <ItemCard
          item={makeChecklistItem({
            storage_location: null,
            specs: [makeChecklistSpec({ id: 1, storage_location: null })],
          })}
        />
      </ul>,
    );

    expect(countItemBadges('託運')).toBe(0);
    expect(countItemBadges('隨身')).toBe(0);
  });

  it('lists numbered specs with their own storage badges', () => {
    render(
      <ul>
        <ItemCard
          item={makeChecklistItem({
            specs: [
              makeChecklistSpec({ id: 1, name: 'Red' }),
              makeChecklistSpec({
                id: 2,
                name: 'Blue',
                storage_location: '隨身',
              }),
            ],
          })}
        />
      </ul>,
    );

    const specList = screen.getByRole('list', { name: '規格' });
    const rows = within(specList).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('1.Red');
    expect(rows[1]).toHaveTextContent('2.Blue');
    expect(within(rows[1]).getByText('隨身')).toBeInTheDocument();
  });

  it('omits the spec list when the item has no specs', () => {
    render(
      <ul>
        <ItemCard item={makeChecklistItem({ specs: [] })} />
      </ul>,
    );

    expect(
      screen.queryByRole('list', { name: '規格' }),
    ).not.toBeInTheDocument();
  });
});
