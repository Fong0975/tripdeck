import { DEFAULT_LOCATION_LABELS, type LocationLabel } from '@tripdeck/shared';

/** The defined location labels as the checklist UI consumes them. */
export interface LocationLabelSet {
  /** Labels in display order. */
  labels: LocationLabel[];
  /** Label names in display order. */
  names: string[];
  /** Re-reads the labels, e.g. after they were managed. */
  reload: () => Promise<void>;
}

/**
 * Builds a {@link LocationLabelSet}.
 *
 * @param labels - Labels in display order.
 * @param reload - Re-reads the labels from the server.
 */
export function buildLabelSet(
  labels: LocationLabel[],
  reload: () => Promise<void>,
): LocationLabelSet {
  return { labels, names: labels.map(label => label.name), reload };
}

/** The labels a fresh database starts with; used until the real ones load. */
export const DEFAULT_LABELS: LocationLabel[] = DEFAULT_LOCATION_LABELS.map(
  (name, index) => ({
    id: -(index + 1),
    name,
    show_as_group: true,
    sort_order: index,
  }),
);

export const DEFAULT_LABEL_SET: LocationLabelSet = buildLabelSet(
  DEFAULT_LABELS,
  async () => {},
);
