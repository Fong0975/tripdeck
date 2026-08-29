import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { TransportMode, TravelConnection } from '@/types';

import TravelConnectionItem from './TravelConnectionItem';

function makeConnection(
  overrides: Partial<TravelConnection> = {},
): TravelConnection {
  return {
    id: 1,
    fromAttractionId: 10,
    toAttractionId: 20,
    transportMode: 'walk',
    ...overrides,
  };
}

describe('TravelConnectionItem', () => {
  it.each([
    { mode: 'walk' as TransportMode, label: '步行' },
    { mode: 'transit' as TransportMode, label: '大眾運輸' },
    { mode: 'drive' as TransportMode, label: '開車' },
    { mode: 'bike' as TransportMode, label: '騎車' },
    { mode: 'taxi' as TransportMode, label: '計程車／Uber' },
    { mode: 'flight' as TransportMode, label: '飛機' },
    { mode: 'other' as TransportMode, label: '其他' },
  ])('shows the $label label for transport mode $mode', ({ mode, label }) => {
    render(
      <TravelConnectionItem
        connection={makeConnection({ transportMode: mode })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it.each([
    {
      description: 'a structured duration is set',
      duration: '90',
      expected: '1 小時 30 分鐘',
    },
    { description: 'no duration is set', duration: null, expected: null },
  ])('renders duration text when $description', ({ duration, expected }) => {
    render(
      <TravelConnectionItem
        connection={makeConnection({ duration })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    if (expected) {
      expect(screen.getByText(expected)).toBeInTheDocument();
    } else {
      expect(screen.queryByText(/分鐘|小時/)).not.toBeInTheDocument();
    }
  });

  describe('route', () => {
    it('shows the label and renders markdown syntax when route is set', () => {
      render(
        <TravelConnectionItem
          connection={makeConnection({ route: '**搭乘銀座線**' })}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );

      expect(screen.getByText('路線說明')).toBeInTheDocument();
      const bold = screen.getByText('搭乘銀座線');
      expect(bold.tagName).toBe('STRONG');
    });

    it('does not show the label when route is not set', () => {
      render(
        <TravelConnectionItem
          connection={makeConnection({ route: null })}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );

      expect(screen.queryByText('路線說明')).not.toBeInTheDocument();
    });
  });

  describe('notes', () => {
    it('shows the label and renders content as literal text when notes is set', () => {
      render(
        <TravelConnectionItem
          connection={makeConnection({ notes: '**帶雨傘**' })}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );

      expect(screen.getByText('備註')).toBeInTheDocument();
      expect(screen.getByText('**帶雨傘**')).toBeInTheDocument();
    });

    it('does not show the label when notes is not set', () => {
      render(
        <TravelConnectionItem
          connection={makeConnection({ notes: null })}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );

      expect(screen.queryByText('備註')).not.toBeInTheDocument();
    });
  });

  it('shows an image thumbnail when the connection has images', () => {
    render(
      <TravelConnectionItem
        connection={makeConnection({
          images: [{ id: 1, filename: 'a.jpg', title: 'A' }],
        })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByAltText('A')).toBeInTheDocument();
  });

  it('shows no thumbnail when the connection has no images', () => {
    render(
      <TravelConnectionItem
        connection={makeConnection({ images: [] })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  describe('image lightbox', () => {
    it('opens the lightbox and does not trigger onEdit when the thumbnail strip is clicked', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      render(
        <TravelConnectionItem
          connection={makeConnection({
            images: [
              { id: 1, filename: 'a.jpg', title: 'Img 1' },
              { id: 2, filename: 'b.jpg', title: 'Img 2' },
            ],
          })}
          onEdit={onEdit}
          onDelete={vi.fn()}
        />,
      );

      await user.click(screen.getByRole('button', { name: /Img 1/ }));

      expect(screen.getByText('1 / 2')).toBeInTheDocument();
      expect(onEdit).not.toHaveBeenCalled();
    });
  });

  it('calls onEdit with the connection when clicked', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    const connection = makeConnection();
    render(
      <TravelConnectionItem
        connection={connection}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByText('步行'));

    expect(onEdit).toHaveBeenCalledWith(connection);
  });

  describe('delete button', () => {
    it('opens a confirmation dialog on click without calling onDelete or onEdit', async () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(
        <TravelConnectionItem
          connection={makeConnection()}
          onEdit={onEdit}
          onDelete={onDelete}
        />,
      );

      await user.click(screen.getByTitle('刪除'));

      expect(onDelete).not.toHaveBeenCalled();
      expect(onEdit).not.toHaveBeenCalled();
      expect(
        screen.getByText('確定要刪除這筆交通方式嗎？'),
      ).toBeInTheDocument();
    });

    it('calls onDelete with the connection id when the dialog is confirmed', async () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const user = userEvent.setup();
      const connection = makeConnection({ id: 7 });
      render(
        <TravelConnectionItem
          connection={connection}
          onEdit={onEdit}
          onDelete={onDelete}
        />,
      );

      await user.click(screen.getByTitle('刪除'));
      await user.click(screen.getByText('刪除', { selector: 'button' }));

      expect(onDelete).toHaveBeenCalledWith(7);
      expect(onEdit).not.toHaveBeenCalled();
    });

    it('does not call onDelete when the dialog is cancelled', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(
        <TravelConnectionItem
          connection={makeConnection()}
          onEdit={vi.fn()}
          onDelete={onDelete}
        />,
      );

      await user.click(screen.getByTitle('刪除'));
      await user.click(screen.getByText('取消'));

      expect(onDelete).not.toHaveBeenCalled();
      expect(
        screen.queryByText('確定要刪除這筆交通方式嗎？'),
      ).not.toBeInTheDocument();
    });
  });
});
