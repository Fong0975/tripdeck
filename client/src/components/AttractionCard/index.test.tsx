import { DndContext } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import ClampedTextSection from '@/components/ClampedTextSection';
import { makeAttraction, makeImage } from '@/test-utils/fixtures';
import RerenderHarness from '@/test-utils/RerenderHarness';
import type { Attraction, UploadedImage } from '@/types';

import AttractionCard from './index';

vi.mock('@/components/ClampedTextSection', async () => ({
  default: vi.fn((await import('@/test-utils/stubs')).ClampedTextSectionStub),
}));

type CardProps = ComponentProps<typeof AttractionCard>;

const memoAttraction = makeAttraction({ notes: 'memo notes' });
const memoSortableItems = [memoAttraction.id];

function renderCard(options: { attraction?: Attraction } = {}) {
  const attraction = options.attraction ?? makeAttraction();

  render(
    <DndContext>
      <SortableContext
        items={[attraction.id]}
        strategy={verticalListSortingStrategy}
      >
        <AttractionCard
          attraction={attraction}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </SortableContext>
    </DndContext>,
  );

  return { attraction };
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
      images: [makeImage({ filename: 'a.jpg', title: 'Photo A' })],
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

  it('opens the lightbox when the thumbnail stack is clicked and closes it on Escape', async () => {
    const user = userEvent.setup();
    const images: UploadedImage[] = [
      makeImage({ filename: 'a.jpg', title: 'Img 1' }),
      makeImage({ id: 2, filename: 'b.jpg', title: 'Img 2' }),
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
          images: [makeImage({ filename: 'a.jpg', title: 'Photo A' })],
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

  describe('memoization', () => {
    it.each([
      {
        description: 'identical props',
        nextProps: (props: CardProps) => props,
        rerenders: false,
      },
      {
        description: 'a new attraction object',
        nextProps: (props: CardProps) => ({
          ...props,
          attraction: { ...props.attraction },
        }),
        rerenders: true,
      },
      {
        description: 'a new onEdit callback',
        nextProps: (props: CardProps) => ({ ...props, onEdit: vi.fn() }),
        rerenders: true,
      },
    ])(
      're-renders: $rerenders when the parent re-renders with $description',
      ({ nextProps, rerenders }) => {
        const initialProps: CardProps = {
          attraction: memoAttraction,
          onEdit: vi.fn(),
          onDelete: vi.fn(),
        };
        render(
          <DndContext>
            <SortableContext
              items={memoSortableItems}
              strategy={verticalListSortingStrategy}
            >
              <RerenderHarness
                initialProps={initialProps}
                nextProps={nextProps}
              >
                {props => <AttractionCard {...props} />}
              </RerenderHarness>
            </SortableContext>
          </DndContext>,
        );
        const rendersBefore = vi.mocked(ClampedTextSection).mock.calls.length;

        fireEvent.click(screen.getByText('rerender-harness'));

        expect(
          vi.mocked(ClampedTextSection).mock.calls.length > rendersBefore,
        ).toBe(rerenders);
      },
    );
  });
});
