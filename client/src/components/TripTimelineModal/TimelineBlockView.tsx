import { blockTimeLabel, travelLabel } from './blockLabel';
import {
  LANE_BAR_WIDTH,
  LANE_WIDTH,
  type PositionedBlock,
} from './layoutCards';
import { getBlockColor } from './timelinePalette';

interface Props {
  item: PositionedBlock;
  /** Width of the bar track; cards start to its right. */
  trackWidth: number;
}

/**
 * One block: a color bar (or point marker) in the lane track plus the card
 * beside it, tinted with the same color so the two can be matched.
 */
export default function TimelineBlockView({ item, trackWidth }: Props) {
  const { block, barTop, barHeight, cardTop, cardHeight } = item;
  const barStyle = {
    top: barTop,
    height: barHeight,
    left: block.lane * LANE_WIDTH,
    width: LANE_BAR_WIDTH,
  };
  const cardStyle = { top: cardTop, height: cardHeight, left: trackWidth + 4 };

  if (block.kind === 'travel') {
    return (
      <>
        <div
          aria-hidden='true'
          style={barStyle}
          className='absolute rounded-full bg-foreground/60'
        />
        <div
          style={cardStyle}
          title={`${travelLabel(block)}\n${blockTimeLabel(block)}`}
          className='absolute right-1 overflow-hidden rounded-md border-l-4 border-foreground/60 bg-foreground/15 px-2 py-1 text-xs text-foreground/80'
        >
          <p className='truncate'>{travelLabel(block)}</p>
          <p className='truncate text-foreground/60'>{blockTimeLabel(block)}</p>
        </div>
      </>
    );
  }

  const color = getBlockColor(block.colorIndex);
  const timeLabel = blockTimeLabel(block);
  const { name, notes } = block.attraction;
  return (
    <>
      <div
        aria-hidden='true'
        style={{ ...barStyle, backgroundColor: color.solid }}
        className='absolute rounded-full'
      />
      <div
        style={{
          ...cardStyle,
          borderLeftColor: color.solid,
          backgroundColor: color.tint,
        }}
        title={[name, timeLabel, notes].filter(Boolean).join('\n')}
        className='absolute right-1 overflow-hidden rounded-md border-l-4 px-2 py-1'
      >
        <p className='truncate text-sm font-medium text-foreground'>{name}</p>
        <p className='truncate text-xs text-muted-foreground'>{timeLabel}</p>
      </div>
    </>
  );
}
