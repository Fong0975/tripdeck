import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { describe, expect, it, vi } from 'vitest';

import type { Trip } from '@/types';

import TripHeaderSummary from './TripHeaderSummary';

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 1,
    title: 'Japan Trip',
    destination: null,
    startDate: '2026-08-20',
    endDate: '2026-08-22',
    createdAt: '2026-08-01',
    ...overrides,
  };
}

function renderSummary(
  options: {
    trip?: Partial<Trip>;
    expanded?: boolean;
    onEdit?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
  } = {},
) {
  return render(
    <TripHeaderSummary
      trip={makeTrip(options.trip)}
      expanded={options.expanded ?? false}
      onMouseEnter={options.onMouseEnter ?? vi.fn()}
      onMouseLeave={options.onMouseLeave ?? vi.fn()}
      onEdit={options.onEdit ?? vi.fn()}
    />,
  );
}

/**
 * The collapsed summary and the expanded details section are both kept
 * mounted at all times (marked via `role='group'`) so the expand/collapse
 * transition can animate smoothly — only one of the two groups is ever
 * visible (aria-hidden='false') at a time. `hidden: true` is required
 * because `getByRole` otherwise excludes elements hidden via aria-hidden.
 *
 * Per the ARIA accname spec, an `aria-hidden="true"` element's computed
 * accessible name is always `""` regardless of its `aria-label` — so a
 * literal `name` string never matches whichever group is currently
 * collapsed. A matcher function reading the raw `aria-label` attribute
 * sidesteps that.
 */
function byAriaLabel(label: string) {
  return (_accessibleName: string, element: Element) =>
    element.getAttribute('aria-label') === label;
}

function getSummaryGroup() {
  return screen.getByRole('group', {
    name: byAriaLabel('旅程摘要資訊'),
    hidden: true,
  });
}

function getDetailsGroup() {
  return screen.getByRole('group', {
    name: byAriaLabel('旅程詳細資訊'),
    hidden: true,
  });
}

describe('TripHeaderSummary', () => {
  it('renders the trip title and the formatted date range', () => {
    renderSummary();

    expect(screen.getByText('Japan Trip')).toBeInTheDocument();
    const start = format(parseISO('2026-08-20'), 'yyyy/MM/dd', {
      locale: zhTW,
    });
    const end = format(parseISO('2026-08-22'), 'yyyy/MM/dd', {
      locale: zhTW,
    });
    expect(
      within(getSummaryGroup()).getByText(`${start} – ${end}`),
    ).toBeInTheDocument();
  });

  it('keeps the details section hidden from assistive tech while collapsed', () => {
    renderSummary({ trip: { destination: 'Tokyo' }, expanded: false });

    const detailsGroup = getDetailsGroup();
    expect(detailsGroup).toHaveAttribute('aria-hidden', 'true');
    expect(within(detailsGroup).getByText('3 天')).toBeInTheDocument();
    expect(within(detailsGroup).getByText('Tokyo')).toBeInTheDocument();
  });

  it('reveals the total day count and destination when expanded', () => {
    renderSummary({ trip: { destination: 'Tokyo' }, expanded: true });

    const detailsGroup = getDetailsGroup();
    expect(detailsGroup).toHaveAttribute('aria-hidden', 'false');
    expect(within(detailsGroup).getByText('3 天')).toBeInTheDocument();
    expect(within(detailsGroup).getByText('Tokyo')).toBeInTheDocument();
  });

  it('notifies the parent on hover and unhover instead of managing expand state itself', async () => {
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();
    const user = userEvent.setup();
    renderSummary({ onMouseEnter, onMouseLeave });

    const title = screen.getByText('Japan Trip');

    await user.hover(title);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);

    await user.unhover(title);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
  });

  it.each([
    { description: 'a destination is set', destination: 'Tokyo' },
    { description: 'no destination is set', destination: null },
  ])(
    'shows the destination only when $description, while expanded',
    ({ destination }) => {
      renderSummary({ trip: { destination }, expanded: true });

      const detailsGroup = getDetailsGroup();
      expect(detailsGroup).toHaveAttribute('aria-hidden', 'false');

      if (destination) {
        expect(within(detailsGroup).getByText(destination)).toBeInTheDocument();
      } else {
        expect(screen.queryByText('Tokyo')).not.toBeInTheDocument();
      }
    },
  );

  it('shows an image count badge next to the description when collapsed', () => {
    renderSummary({
      trip: {
        description: '記得帶護照',
        images: [
          { id: 1, filename: 'a.jpg', title: 'A' },
          { id: 2, filename: 'b.jpg', title: 'B' },
        ],
      },
    });

    expect(within(getSummaryGroup()).getByText('2')).toBeInTheDocument();
  });

  it('shows the image count badge next to the date when there is no description', () => {
    renderSummary({
      trip: {
        description: null,
        images: [{ id: 1, filename: 'a.jpg', title: 'A' }],
      },
    });

    expect(within(getSummaryGroup()).getByText('1')).toBeInTheDocument();
  });

  it('does not show an image count badge when the trip has no images', () => {
    renderSummary({ trip: { description: '記得帶護照', images: [] } });

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows an ImageStrip while expanded, which opens the lightbox on click', async () => {
    const user = userEvent.setup();
    renderSummary({
      trip: { images: [{ id: 1, filename: 'a.jpg', title: 'Cover' }] },
      expanded: true,
    });

    const strip = within(getDetailsGroup()).getByTitle('Cover');
    expect(strip).toBeInTheDocument();

    await user.click(strip);

    // One <img> from the ImageStrip thumbnail, one from the now-open lightbox.
    expect(screen.getAllByAltText('Cover')).toHaveLength(2);
  });

  it.each([
    { description: 'a description is set', tripDescription: '記得帶護照' },
    { description: 'no description is set', tripDescription: null },
  ])(
    'shows the trip description only when $description',
    ({ tripDescription }) => {
      renderSummary({ trip: { description: tripDescription } });

      if (tripDescription) {
        expect(
          within(getSummaryGroup()).getByText(tripDescription),
        ).toBeInTheDocument();
      } else {
        expect(screen.queryByText('記得帶護照')).not.toBeInTheDocument();
      }
    },
  );

  it('calls onEdit when the edit button is clicked', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    renderSummary({ onEdit });

    await user.click(screen.getByLabelText('編輯旅程資訊'));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
