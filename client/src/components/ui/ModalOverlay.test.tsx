import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getBackdrop } from '@/test-utils/queries';

import ModalOverlay from './ModalOverlay';

describe('ModalOverlay', () => {
  it.each([
    {
      description: 'the backdrop is clicked',
      act: (container: HTMLElement) => fireEvent.click(getBackdrop(container)),
      expectedCalls: 1,
    },
    {
      description: 'Escape is pressed',
      act: () => fireEvent.keyDown(window, { key: 'Escape' }),
      expectedCalls: 1,
    },
    {
      description: 'the panel content is clicked',
      act: () => fireEvent.click(screen.getByText('panel')),
      expectedCalls: 0,
    },
  ])(
    'calls onClose $expectedCalls time(s) when $description',
    ({ act, expectedCalls }) => {
      const onClose = vi.fn();
      const { container } = render(
        <ModalOverlay onClose={onClose}>
          <p>panel</p>
        </ModalOverlay>,
      );

      act(container);

      expect(onClose).toHaveBeenCalledTimes(expectedCalls);
    },
  );

  it.each([
    { isolateWheel: true, expectedOuterCalls: 0 },
    { isolateWheel: false, expectedOuterCalls: 1 },
  ])(
    'lets wheel events reach outer handlers $expectedOuterCalls time(s) when isolateWheel is $isolateWheel',
    ({ isolateWheel, expectedOuterCalls }) => {
      const onOuterWheel = vi.fn();
      render(
        <div onWheel={onOuterWheel}>
          <ModalOverlay onClose={vi.fn()} isolateWheel={isolateWheel}>
            <p>panel</p>
          </ModalOverlay>
        </div>,
      );

      fireEvent.wheel(screen.getByText('panel'));

      expect(onOuterWheel).toHaveBeenCalledTimes(expectedOuterCalls);
    },
  );
});
