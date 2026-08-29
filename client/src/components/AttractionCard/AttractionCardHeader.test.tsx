import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Attraction } from '@/types';

import AttractionCardHeader from './AttractionCardHeader';

function makeAttraction(overrides: Partial<Attraction> = {}): Attraction {
  return {
    id: 1,
    name: 'Test Attraction',
    ...overrides,
  };
}

describe('AttractionCardHeader', () => {
  it.each([
    {
      description: 'has a googleMapUrl',
      attraction: makeAttraction({
        googleMapUrl: 'https://maps.google.com/?q=x',
      }),
      expectPresent: true,
    },
    {
      description: 'has no googleMapUrl',
      attraction: makeAttraction({ googleMapUrl: null }),
      expectPresent: false,
    },
  ])(
    'renders the Google Maps marker as $expectPresent when the attraction $description',
    ({ attraction, expectPresent }) => {
      render(
        <AttractionCardHeader
          attraction={attraction}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );

      if (expectPresent) {
        expect(screen.getByTitle('Google Maps')).toBeInTheDocument();
      } else {
        expect(screen.queryByTitle('Google Maps')).not.toBeInTheDocument();
      }
    },
  );

  it.each([
    { description: 'onDuplicate is provided', onDuplicate: vi.fn() },
    { description: 'onDuplicate is omitted', onDuplicate: undefined },
  ])(
    'renders the duplicate button only when $description',
    ({ onDuplicate }) => {
      render(
        <AttractionCardHeader
          attraction={makeAttraction()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onDuplicate={onDuplicate}
        />,
      );

      if (onDuplicate) {
        expect(screen.getByTitle('複製')).toBeInTheDocument();
      } else {
        expect(screen.queryByTitle('複製')).not.toBeInTheDocument();
      }
    },
  );

  it('calls onEdit with the attraction', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const attraction = makeAttraction();
    render(
      <AttractionCardHeader
        attraction={attraction}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByTitle('編輯'));

    expect(onEdit).toHaveBeenCalledWith(attraction);
  });

  it('calls onDuplicate with the attraction', async () => {
    const user = userEvent.setup();
    const onDuplicate = vi.fn();
    const attraction = makeAttraction();
    render(
      <AttractionCardHeader
        attraction={attraction}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={onDuplicate}
      />,
    );

    await user.click(screen.getByTitle('複製'));

    expect(onDuplicate).toHaveBeenCalledWith(attraction);
  });

  it('opens a confirmation dialog on click without calling onDelete', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <AttractionCardHeader
        attraction={makeAttraction({ name: 'Test Attraction' })}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByTitle('刪除'));

    expect(onDelete).not.toHaveBeenCalled();
    expect(
      screen.getByText('確定要刪除「Test Attraction」嗎？'),
    ).toBeInTheDocument();
  });

  it('calls onDelete with the attraction id when the dialog is confirmed', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const attraction = makeAttraction();
    render(
      <AttractionCardHeader
        attraction={attraction}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByTitle('刪除'));
    await user.click(screen.getByText('刪除', { selector: 'button' }));

    expect(onDelete).toHaveBeenCalledWith(attraction.id);
  });

  it('does not call onDelete when the dialog is cancelled', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <AttractionCardHeader
        attraction={makeAttraction()}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByTitle('刪除'));
    await user.click(screen.getByText('取消'));

    expect(onDelete).not.toHaveBeenCalled();
  });
});
