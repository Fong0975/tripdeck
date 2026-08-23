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

  it.each([
    {
      description: 'the connection has images',
      images: [{ id: 1, filename: 'a.jpg', title: 'A' }],
      expected: '1',
    },
    { description: 'the connection has no images', images: [], expected: null },
  ])('shows the image count when $description', ({ images, expected }) => {
    render(
      <TravelConnectionItem
        connection={makeConnection({ images })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    if (expected) {
      expect(screen.getByText(expected)).toBeInTheDocument();
    } else {
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    }
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
    it('arms confirmation on first click without calling onDelete or onEdit', async () => {
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
      expect(screen.getByTitle('再次點擊確認')).toBeInTheDocument();
    });

    it('calls onDelete with the connection id on the second click, without triggering onEdit', async () => {
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
      await user.click(screen.getByTitle('再次點擊確認'));

      expect(onDelete).toHaveBeenCalledWith(7);
      expect(onEdit).not.toHaveBeenCalled();
    });
  });
});
