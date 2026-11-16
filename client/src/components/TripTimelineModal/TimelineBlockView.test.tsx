import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeAttraction, makeConnection, makeDay } from '@/test-utils/fixtures';

import { buildDayTimeline } from './buildDayTimeline';
import { layoutDay } from './layoutCards';
import TimelineBlockView from './TimelineBlockView';

const RANGE = { startHour: 9, endHour: 13 };

function renderBlock(day = makeDay(), index = 0) {
  const { items } = layoutDay(buildDayTimeline(day).blocks, RANGE);
  return render(
    <div>
      <TimelineBlockView item={items[index]} trackWidth={12} />
    </div>,
  );
}

describe('TimelineBlockView', () => {
  it.each([
    {
      description: 'a range',
      attraction: { startTime: '09:00', endTime: '10:00', notes: null },
      text: '09:00–10:00',
      title: 'Museum 09:00–10:00',
    },
    {
      description: 'a point',
      attraction: { startTime: '09:00', endTime: null, notes: null },
      text: '09:00',
      title: 'Museum 09:00',
    },
    {
      description: 'a block with notes',
      attraction: { startTime: '09:00', endTime: '10:00', notes: 'Bring ID' },
      text: '09:00–10:00',
      title: 'Museum 09:00–10:00 Bring ID',
    },
  ])('shows name and time for $description', ({ attraction, text, title }) => {
    renderBlock(
      makeDay({
        attractions: [makeAttraction({ name: 'Museum', ...attraction })],
      }),
    );

    expect(screen.getByText('Museum')).toBeInTheDocument();
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByTitle(title)).toBeInTheDocument();
  });

  it('shows the transport and duration for a travel block', () => {
    renderBlock(
      makeDay({
        attractions: [
          makeAttraction({ id: 1, startTime: '09:00', endTime: '10:00' }),
          makeAttraction({ id: 2 }),
        ],
        connections: [
          makeConnection({
            fromAttractionId: 1,
            toAttractionId: 2,
            transportMode: 'transit',
            duration: '45',
          }),
        ],
      }),
      1,
    );

    expect(screen.getByText('🚇 大眾運輸 45 分鐘')).toBeInTheDocument();
    expect(screen.getByText('10:00–10:45')).toBeInTheDocument();
    expect(
      screen.getByTitle('🚇 大眾運輸 45 分鐘 10:00–10:45'),
    ).toBeInTheDocument();
  });
});
