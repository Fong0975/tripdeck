import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AnchoredPopover from './AnchoredPopover';

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPopover(onClose = vi.fn()) {
  const anchorRef = createRef<HTMLButtonElement>();
  render(
    <>
      <button ref={anchorRef}>anchor</button>
      <p>elsewhere</p>
      <AnchoredPopover anchorRef={anchorRef} label='選單' onClose={onClose}>
        <button>inside</button>
      </AnchoredPopover>
    </>,
  );
  return { onClose, anchor: screen.getByText('anchor') };
}

function mockLayout({
  anchorTop,
  anchorBottom,
  popoverHeight,
}: {
  anchorTop: number;
  anchorBottom: number;
  popoverHeight: number;
}) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top: anchorTop,
    bottom: anchorBottom,
    left: 20,
    right: 60,
    width: 40,
    height: anchorBottom - anchorTop,
    x: 20,
    y: anchorTop,
    toJSON: () => ({}),
  });
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(
    popoverHeight,
  );
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(120);
}

describe('AnchoredPopover', () => {
  it('renders its content in a labelled group', () => {
    renderPopover();

    expect(screen.getByRole('group', { name: '選單' })).toContainElement(
      screen.getByText('inside'),
    );
  });

  it.each([
    {
      description: 'below the anchor when there is room',
      layout: { anchorTop: 100, anchorBottom: 130, popoverHeight: 80 },
      top: '134px',
    },
    {
      description: 'above the anchor when there is no room below',
      layout: { anchorTop: 700, anchorBottom: 730, popoverHeight: 80 },
      top: '616px',
    },
    {
      description: 'below the anchor when there is no room on either side',
      layout: { anchorTop: 20, anchorBottom: 50, popoverHeight: 900 },
      top: '54px',
    },
  ])('opens $description', ({ layout, top }) => {
    mockLayout(layout);

    renderPopover();

    const popover = screen.getByRole('group', { name: '選單' });
    expect(popover).toHaveStyle({ top, left: '20px', visibility: 'visible' });
  });

  it.each([
    {
      description: 'a click outside',
      act: () => fireEvent.mouseDown(screen.getByText('elsewhere')),
      closes: true,
    },
    {
      description: 'a click on the anchor',
      act: () => fireEvent.mouseDown(screen.getByText('anchor')),
      closes: false,
    },
    {
      description: 'a click inside',
      act: () => fireEvent.mouseDown(screen.getByText('inside')),
      closes: false,
    },
    {
      description: 'Escape',
      act: () => fireEvent.keyDown(window, { key: 'Escape' }),
      closes: true,
    },
    {
      description: 'scrolling the page',
      act: () => fireEvent.scroll(document),
      closes: true,
    },
    {
      description: 'scrolling inside the popover',
      act: () => fireEvent.scroll(screen.getByRole('group', { name: '選單' })),
      closes: false,
    },
    {
      description: 'resizing the window',
      act: () => fireEvent(window, new Event('resize')),
      closes: true,
    },
  ])('handles $description', ({ act, closes }) => {
    const { onClose } = renderPopover();

    act();

    if (closes) {
      expect(onClose).toHaveBeenCalled();
    } else {
      expect(onClose).not.toHaveBeenCalled();
    }
  });

  it('stops listening once unmounted', () => {
    const onClose = vi.fn();
    const anchorRef = createRef<HTMLButtonElement>();
    const { unmount } = render(
      <AnchoredPopover anchorRef={anchorRef} label='選單' onClose={onClose}>
        <button>inside</button>
      </AnchoredPopover>,
    );

    unmount();
    fireEvent.mouseDown(document.body);
    fireEvent.scroll(document);

    expect(onClose).not.toHaveBeenCalled();
  });
});
