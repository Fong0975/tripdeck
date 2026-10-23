import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale/zh-TW';
import { describe, expect, it, vi } from 'vitest';

import { makeImage, makeTrip } from '@/test-utils/fixtures';
import { byAriaLabel } from '@/test-utils/queries';
import type { Trip } from '@/types';

import TripHeaderSummary from './TripHeaderSummary';

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
      trip={makeTrip({
        title: 'Japan Trip',
        startDate: '2026-08-20',
        endDate: '2026-08-22',
        ...options.trip,
      })}
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
 * collapsed. `byAriaLabel` reads the raw `aria-label` attribute to
 * sidestep that.
 */
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

  it('omits the destination while expanded when none is set', () => {
    renderSummary({ trip: { destination: null }, expanded: true });

    expect(getDetailsGroup()).toHaveAttribute('aria-hidden', 'false');
    expect(screen.queryByText('Tokyo')).not.toBeInTheDocument();
  });

  it('shows an image count badge next to the description when collapsed', () => {
    renderSummary({
      trip: {
        description: '記得帶護照',
        images: [
          makeImage({ id: 1, filename: 'a.jpg', title: 'A' }),
          makeImage({ id: 2, filename: 'b.jpg', title: 'B' }),
        ],
      },
    });

    expect(within(getSummaryGroup()).getByText('2')).toBeInTheDocument();
  });

  it('shows the image count badge next to the date when there is no description', () => {
    renderSummary({
      trip: {
        description: null,
        images: [makeImage({ id: 1, filename: 'a.jpg', title: 'A' })],
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
      trip: {
        images: [makeImage({ id: 1, filename: 'a.jpg', title: 'Cover' })],
      },
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
