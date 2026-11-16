import { TIMELINE_PALETTE_SIZE } from './buildDayTimeline';

const HUES = [210, 25, 150, 280, 350, 45, 180, 100];

/** The solid and translucent forms of one palette color. */
export interface BlockColor {
  solid: string;
  tint: string;
}

/**
 * Resolves a palette index to CSS colors. The mid-range saturation and
 * lightness keep contrast acceptable on both light and dark backgrounds.
 *
 * @param index - Palette index; wrapped into the palette size.
 */
export function getBlockColor(index: number): BlockColor {
  const hue =
    HUES[
      ((index % TIMELINE_PALETTE_SIZE) + TIMELINE_PALETTE_SIZE) %
        TIMELINE_PALETTE_SIZE
    ];
  return {
    solid: `hsl(${hue} 65% 50%)`,
    tint: `hsl(${hue} 65% 50% / 0.14)`,
  };
}
