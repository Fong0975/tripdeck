/** How many days one timeline picture holds; `'all'` puts every day in one. */
export type DaysPerImage = 1 | 2 | 3 | 4 | 'all';

/** The choices offered for {@link DaysPerImage}, in display order. */
export const DAYS_PER_IMAGE_CHOICES: readonly DaysPerImage[] = [
  1,
  2,
  3,
  4,
  'all',
];

/** Settings for the timeline picture section of the exported document. */
export interface TimelineExportOptions {
  /** Whether the timeline section is included at all. */
  enabled: boolean;
  daysPerImage: DaysPerImage;
}

/** Settings for the per-day attraction map picture of the exported document. */
export interface DayMapExportOptions {
  /** Whether each day gets a map picture after its date heading. */
  enabled: boolean;
}

/** Everything the user can configure before exporting to Word. */
export interface ExportOptions {
  timeline: TimelineExportOptions;
  dayMap: DayMapExportOptions;
}

/** The options an export dialog starts from. */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  timeline: { enabled: true, daysPerImage: 4 },
  dayMap: { enabled: true },
};
