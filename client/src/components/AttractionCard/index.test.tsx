import { DndContext } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';

import type { Attraction, AttractionImage } from '@/types';

import AttractionCard from './index';

function makeAttraction(overrides: Partial<Attraction> = {}): Attraction {
  return {
    id: 1,
    name: 'Test Attraction',
    ...overrides,
  };
}

interface RenderCardOptions {
  attraction?: Attraction;
  onEdit?: Mock;
  onDelete?: Mock;
  onDuplicate?: Mock;
}

function renderCard(options: RenderCardOptions = {}) {
  const attraction = options.attraction ?? makeAttraction();
  const onEdit = options.onEdit ?? vi.fn();
  const onDelete = options.onDelete ?? vi.fn();
  const onParentClick = vi.fn();

  render(
    <div onClick={onParentClick}>
      <DndContext>
        <SortableContext
          items={[attraction.id]}
          strategy={verticalListSortingStrategy}
        >
          <AttractionCard
            attraction={attraction}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={options.onDuplicate}
          />
        </SortableContext>
      </DndContext>
    </div>,
  );

  return { attraction, onEdit, onDelete, onParentClick };
}

const conditionalRenderingCases: {
  description: string;
  attraction: Attraction;
  query: () => HTMLElement | null;
  expectPresent: boolean;
}[] = [
  {
    description: 'has images',
    attraction: makeAttraction({
      images: [{ id: 1, filename: 'a.jpg', title: 'Photo A' }],
    }),
    query: () => screen.queryByAltText('Photo A'),
    expectPresent: true,
  },
  {
    description: 'has no images',
    attraction: makeAttraction({ images: [] }),
    query: () => screen.queryByAltText('Photo A'),
    expectPresent: false,
  },
  {
    description: 'has reference websites',
    attraction: makeAttraction({
      referenceWebsites: [{ url: 'https://example.com', title: 'Ref Site' }],
    }),
    query: () => screen.queryByText('Ref Site'),
    expectPresent: true,
  },
  {
    description: 'has no reference websites',
    attraction: makeAttraction({ referenceWebsites: [] }),
    query: () => screen.queryByText('Ref Site'),
    expectPresent: false,
  },
  {
    description: 'has non-blank nearby attractions',
    attraction: makeAttraction({ nearbyAttractions: '附近有一間博物館' }),
    query: () => screen.queryByText('附近景點'),
    expectPresent: true,
  },
  {
    description: 'has only whitespace nearby attractions',
    attraction: makeAttraction({ nearbyAttractions: '   ' }),
    query: () => screen.queryByText('附近景點'),
    expectPresent: false,
  },
  {
    description: 'has notes',
    attraction: makeAttraction({ notes: '這是一段備註內容' }),
    query: () => screen.queryByText('這是一段備註內容'),
    expectPresent: true,
  },
  {
    description: 'has no notes',
    attraction: makeAttraction({ notes: null }),
    query: () => screen.queryByText('這是一段備註內容'),
    expectPresent: false,
  },
  {
    description: 'has a startTime or endTime',
    attraction: makeAttraction({ startTime: '09:00', endTime: '18:00' }),
    query: () => screen.queryByText('～', { exact: false }),
    expectPresent: true,
  },
  {
    description: 'has neither startTime nor endTime',
    attraction: makeAttraction({ startTime: null, endTime: null }),
    query: () => screen.queryByText('～', { exact: false }),
    expectPresent: false,
  },
];

describe('AttractionCard', () => {
  describe.each(conditionalRenderingCases)(
    'when the attraction $description',
    ({ attraction, query, expectPresent }) => {
      const label = expectPresent ? 'present' : 'absent';

      it(`renders the section as ${label}`, () => {
        renderCard({ attraction });

        if (expectPresent) {
          expect(query()).toBeInTheDocument();
        } else {
          expect(query()).not.toBeInTheDocument();
        }
      });
    },
  );

  it('calls onEdit with the attraction and does not bubble to the parent', async () => {
    const user = userEvent.setup();
    const { attraction, onEdit, onParentClick } = renderCard();

    await user.click(screen.getByTitle('編輯'));

    expect(onEdit).toHaveBeenCalledWith(attraction);
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it('calls onDuplicate with the attraction and does not bubble to the parent', async () => {
    const user = userEvent.setup();
    const onDuplicate = vi.fn();
    const { attraction, onParentClick } = renderCard({ onDuplicate });

    await user.click(screen.getByTitle('複製'));

    expect(onDuplicate).toHaveBeenCalledWith(attraction);
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it(
    'opens a confirmation dialog on click without calling onDelete, ' +
      'and does not bubble',
    async () => {
      const user = userEvent.setup();
      const { onDelete, onParentClick } = renderCard();

      await user.click(screen.getByTitle('刪除'));

      expect(onDelete).not.toHaveBeenCalled();
      expect(onParentClick).not.toHaveBeenCalled();
      expect(
        screen.getByText('確定要刪除「Test Attraction」嗎？'),
      ).toBeInTheDocument();
    },
  );

  it(
    'calls onDelete with the attraction id when the dialog is confirmed, ' +
      'and does not bubble',
    async () => {
      const user = userEvent.setup();
      const { attraction, onDelete, onParentClick } = renderCard();

      await user.click(screen.getByTitle('刪除'));
      await user.click(screen.getByText('刪除', { selector: 'button' }));

      expect(onDelete).toHaveBeenCalledWith(attraction.id);
      expect(onParentClick).not.toHaveBeenCalled();
    },
  );

  it('does not bubble to the parent when the Google Maps link is clicked', async () => {
    const user = userEvent.setup();
    const { onParentClick } = renderCard({
      attraction: makeAttraction({
        googleMapUrl: 'https://maps.google.com/?q=x',
      }),
    });

    await user.click(screen.getByTitle('Google Maps'));

    expect(onParentClick).not.toHaveBeenCalled();
  });

  it('does not bubble to the parent when a reference website link is clicked', async () => {
    const user = userEvent.setup();
    const { onParentClick } = renderCard({
      attraction: makeAttraction({
        referenceWebsites: [
          { url: 'https://example.com', title: 'Example Site' },
        ],
      }),
    });

    await user.click(screen.getByText('Example Site'));

    expect(onParentClick).not.toHaveBeenCalled();
  });

  it(
    'opens the lightbox and does not bubble when the thumbnail stack ' +
      'is clicked',
    async () => {
      const user = userEvent.setup();
      const images: AttractionImage[] = [
        { id: 1, filename: 'a.jpg', title: 'Img 1' },
        { id: 2, filename: 'b.jpg', title: 'Img 2' },
      ];
      const { onParentClick } = renderCard({
        attraction: makeAttraction({ images }),
      });

      await user.click(screen.getByRole('button', { name: /Img 1/ }));

      expect(onParentClick).not.toHaveBeenCalled();
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    },
  );

  it('closes the lightbox when it requests to close', async () => {
    const user = userEvent.setup();
    const images: AttractionImage[] = [
      { id: 1, filename: 'a.jpg', title: 'Img 1' },
      { id: 2, filename: 'b.jpg', title: 'Img 2' },
    ];
    renderCard({ attraction: makeAttraction({ images }) });
    await user.click(screen.getByRole('button', { name: /Img 1/ }));
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByText('1 / 2')).not.toBeInTheDocument();
  });

  it.each([
    {
      description: 'the end time is missing',
      startTime: '09:00',
      endTime: null,
      expected: '09:00 ～ –',
    },
    {
      description: 'the start time is missing',
      startTime: null,
      endTime: '18:00',
      expected: '– ～ 18:00',
    },
  ])(
    'falls back to an en dash when $description',
    ({ startTime, endTime, expected }) => {
      renderCard({ attraction: makeAttraction({ startTime, endTime }) });

      expect(screen.getByText('～', { exact: false })).toHaveTextContent(
        expected,
      );
    },
  );

  describe('the nearby-attractions section divider', () => {
    it.each([
      {
        description: 'no images or reference websites follow',
        attraction: makeAttraction({ nearbyAttractions: '附近有一間博物館' }),
        expectedSeparators: 1,
      },
      {
        description: 'images follow',
        attraction: makeAttraction({
          nearbyAttractions: '附近有一間博物館',
          images: [{ id: 1, filename: 'a.jpg', title: 'Photo A' }],
        }),
        expectedSeparators: 2,
      },
      {
        description: 'reference websites follow',
        attraction: makeAttraction({
          nearbyAttractions: '附近有一間博物館',
          referenceWebsites: [{ url: 'https://example.com', title: 'Ref' }],
        }),
        expectedSeparators: 2,
      },
    ])(
      'renders $expectedSeparators <hr> when $description',
      ({ attraction, expectedSeparators }) => {
        renderCard({ attraction });

        expect(screen.getAllByRole('separator')).toHaveLength(
          expectedSeparators,
        );
      },
    );
  });

  describe('line-clamped toggle buttons', () => {
    beforeEach(() => {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        value: 100,
      });
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
        configurable: true,
        value: 40,
      });
    });

    afterEach(() => {
      delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
      delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
    });

    it.each([
      {
        description: 'notes',
        attraction: makeAttraction({ notes: '很長很長的備註內容範例文字' }),
      },
      {
        description: 'nearby attractions',
        attraction: makeAttraction({
          nearbyAttractions: '很長很長的附近景點內容範例文字',
        }),
      },
    ])(
      'does not bubble to the parent when the $description toggle is clicked',
      async ({ attraction }) => {
        const user = userEvent.setup();
        const { onParentClick } = renderCard({ attraction });

        await user.click(screen.getByText('展開'));

        expect(onParentClick).not.toHaveBeenCalled();
      },
    );
  });
});
