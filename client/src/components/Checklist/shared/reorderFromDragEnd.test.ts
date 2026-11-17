import type { DragEndEvent } from '@dnd-kit/core';
import { describe, expect, it, vi } from 'vitest';

import { reorderFromDragEnd } from './reorderFromDragEnd';

function dragEnd(activeId: number, overId: number | null) {
  return {
    active: { id: activeId },
    over: overId === null ? null : { id: overId },
  } as unknown as Pick<DragEndEvent, 'active' | 'over'>;
}

describe('reorderFromDragEnd', () => {
  it.each([
    { description: 'dropped on another row', active: 1, over: 3, called: true },
    { description: 'dropped on itself', active: 2, over: 2, called: false },
    {
      description: 'dropped outside the list',
      active: 2,
      over: null,
      called: false,
    },
  ])('handles a drag that was $description', ({ active, over, called }) => {
    const onReorder = vi.fn();

    reorderFromDragEnd(dragEnd(active, over), onReorder);

    if (called) {
      expect(onReorder).toHaveBeenCalledWith(active, over);
    } else {
      expect(onReorder).not.toHaveBeenCalled();
    }
  });

  it('converts string ids from dnd-kit to numbers', () => {
    const onReorder = vi.fn();

    reorderFromDragEnd(
      {
        active: { id: '4' },
        over: { id: '7' },
      } as unknown as Pick<DragEndEvent, 'active' | 'over'>,
      onReorder,
    );

    expect(onReorder).toHaveBeenCalledWith(4, 7);
  });
});
