import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { DayPlan } from '@/types';

import DayNotesSection from './DayNotesSection';

function makeDay(overrides: Partial<DayPlan> = {}): DayPlan {
  return {
    id: 1,
    day: 1,
    date: '2026-08-20',
    locations: [],
    attractions: [],
    connections: [],
    ...overrides,
  };
}

// Per the accname spec, an `aria-hidden='true'` element's computed
// accessible name is always '', so matching by computed name would fail to
// find the drawer whenever it's currently collapsed. Reading the raw
// `aria-label` attribute instead works regardless of hidden state.
function byAriaLabel(label: string) {
  return (_accessibleName: string, element: Element) =>
    element.getAttribute('aria-label') === label;
}

function getDrawer() {
  return screen.getByRole('group', {
    name: byAriaLabel('該日備註與圖片'),
    hidden: true,
  });
}

describe('DayNotesSection', () => {
  it('always renders the edit button', () => {
    render(<DayNotesSection day={makeDay()} onEdit={vi.fn()} />);

    expect(screen.getByLabelText('編輯日備註')).toBeInTheDocument();
  });

  it('calls onEdit when the edit button is clicked', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<DayNotesSection day={makeDay()} onEdit={onEdit} />);

    await user.click(screen.getByLabelText('編輯日備註'));

    expect(onEdit).toHaveBeenCalledTimes(1);
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
