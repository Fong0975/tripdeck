import type { DayPlan } from '@/types';

/** DOM id of a day's tab, for the panel's `aria-labelledby`. */
export function dayTabId(day: DayPlan): string {
  return `day-map-tab-${day.id}`;
}
