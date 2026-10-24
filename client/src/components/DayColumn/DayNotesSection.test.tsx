import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeDay } from '@/test-utils/fixtures';
import { byAriaLabel } from '@/test-utils/queries';

import DayNotesSection from './DayNotesSection';

function getDrawer() {
  return screen.getByRole('group', {
    name: byAriaLabel('該日備註與圖片'),
    hidden: true,
  });
}

describe('DayNotesSection', () => {
  it('calls onEdit when the edit button is clicked', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<DayNotesSection day={makeDay()} onEdit={onEdit} />);

    await user.click(screen.getByLabelText('編輯日備註'));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      description: 'is ready',
      availability: { state: 'ready' } as const,
      expectButton: true,
    },
    {
      description: 'is exhausted',
      availability: { state: 'exhausted', resetAt: null } as const,
      expectButton: true,
    },
    {
      description: 'is unavailable',
      availability: { state: 'unavailable' } as const,
      expectButton: false,
    },
  ])(
    'shows the map button only when the map $description',
    ({ availability, expectButton }) => {
      render(
        <DayNotesSection
          day={makeDay()}
          onEdit={vi.fn()}
          onOpenMap={vi.fn()}
          mapAvailability={availability}
        />,
      );

      expect(screen.queryByLabelText('檢視當日地圖') !== null).toBe(
        expectButton,
      );
    },
  );

  it('omits the map button when no onOpenMap handler is given', () => {
    render(
      <DayNotesSection
        day={makeDay()}
        onEdit={vi.fn()}
        mapAvailability={{ state: 'ready' }}
      />,
    );

    expect(screen.queryByLabelText('檢視當日地圖')).not.toBeInTheDocument();
  });

  it('calls onOpenMap when the map button is clicked', async () => {
    const onOpenMap = vi.fn();
    const user = userEvent.setup();
    render(
      <DayNotesSection
        day={makeDay()}
        onEdit={vi.fn()}
        onOpenMap={onOpenMap}
        mapAvailability={{ state: 'ready' }}
      />,
    );

    await user.click(screen.getByLabelText('檢視當日地圖'));

    expect(onOpenMap).toHaveBeenCalledTimes(1);
  });

  it('renders no summary row or drawer when there are no notes and no images', () => {
    render(<DayNotesSection day={makeDay()} onEdit={vi.fn()} />);

    expect(screen.queryByLabelText('含備註文字')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('group', {
        name: byAriaLabel('該日備註與圖片'),
        hidden: true,
      }),
    ).not.toBeInTheDocument();
  });

  it('shows a notes icon when the day has notes', () => {
    render(
      <DayNotesSection
        day={makeDay({ notes: '記得帶雨傘' })}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('含備註文字')).toBeInTheDocument();
  });

  it('shows the image count when the day has images', () => {
    render(
      <DayNotesSection
        day={makeDay({
          images: [
            { id: 1, filename: 'a.jpg', title: 'A' },
            { id: 2, filename: 'b.jpg', title: 'B' },
          ],
        })}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('keeps the drawer hidden from assistive tech until hovered, then reveals notes and images', async () => {
    const user = userEvent.setup();
    render(
      <DayNotesSection
        day={makeDay({
          notes: '記得帶雨傘',
          images: [{ id: 1, filename: 'a.jpg', title: 'Cover' }],
        })}
        onEdit={vi.fn()}
      />,
    );

    const drawer = getDrawer();
    expect(drawer).toHaveAttribute('aria-hidden', 'true');

    await user.hover(screen.getByLabelText('編輯日備註'));

    expect(drawer).toHaveAttribute('aria-hidden', 'false');
    expect(within(drawer).getByText('記得帶雨傘')).toBeInTheDocument();
    expect(within(drawer).getByTitle('Cover')).toBeInTheDocument();
  });

  it('collapses the drawer again on mouse leave', async () => {
    const user = userEvent.setup();
    render(
      <DayNotesSection
        day={makeDay({ notes: '記得帶雨傘' })}
        onEdit={vi.fn()}
      />,
    );
    const hoverTarget = screen.getByLabelText('編輯日備註');

    await user.hover(hoverTarget);
    expect(getDrawer()).toHaveAttribute('aria-hidden', 'false');

    await user.unhover(hoverTarget);
    expect(getDrawer()).toHaveAttribute('aria-hidden', 'true');
  });

  it('opens the lightbox when an image thumbnail is clicked', async () => {
    const user = userEvent.setup();
    render(
      <DayNotesSection
        day={makeDay({
          images: [{ id: 1, filename: 'a.jpg', title: 'Cover' }],
        })}
        onEdit={vi.fn()}
      />,
    );

    await user.hover(screen.getByLabelText('編輯日備註'));
    await user.click(within(getDrawer()).getByTitle('Cover'));

    // One <img> from the ImageStrip thumbnail, one from the now-open lightbox.
    expect(screen.getAllByAltText('Cover')).toHaveLength(2);
  });
});
