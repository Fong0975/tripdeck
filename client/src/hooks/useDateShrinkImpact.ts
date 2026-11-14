import { useState } from 'react';

import { showToast } from '@/lib/toast';
import type { DayPlan, TripContent } from '@/types';

interface Options {
  tripStartDate: string;
  tripEndDate: string;
  /**
   * Fetches the trip's current content, used to find days outside the new
   * range. Resolving to `null` or rejecting blocks the update, since the
   * impact can't be confirmed.
   */
  getContent: () => Promise<TripContent | null>;
}

/** Total attraction + connection + day images, shown in the impact confirmation. */
export function imageCountOf(day: DayPlan): number {
  return (
    day.attractions.reduce((sum, a) => sum + (a.images?.length ?? 0), 0) +
    day.connections.reduce((sum, c) => sum + (c.images?.length ?? 0), 0) +
    (day.images?.length ?? 0)
  );
}

/**
 * Detects whether narrowing a trip's date range would drop existing days
 * (and their attractions/connections/images), so the caller can hold off
 * and confirm with the user before proceeding with a destructive update.
 */
export function useDateShrinkImpact({
  tripStartDate,
  tripEndDate,
  getContent,
}: Options) {
  const [pendingImpact, setPendingImpact] = useState<DayPlan[] | null>(null);

  /**
   * Returns true when the new date range is safe to apply immediately (a
   * pure expansion, or no days fall outside it). Otherwise returns false and
   * the caller must not apply the update now:
   * - when days would be dropped, they are recorded into `pendingImpact` so
   *   the caller can confirm or cancel via `dismissImpact`;
   * - when the content can't be fetched, an error toast is shown and
   *   `pendingImpact` stays null, aborting the update outright rather than
   *   risking deleting days without confirmation.
   */
  const checkImpact = async (
    newStartDate: string,
    newEndDate: string,
  ): Promise<boolean> => {
    const isPureExpansion =
      newStartDate <= tripStartDate && newEndDate >= tripEndDate;
    if (isPureExpansion) {
      return true;
    }

    const content = await getContent().catch(() => null);
    if (!content) {
      showToast('error', '無法確認日期變更的影響，請稍後再試');
      return false;
    }

    const impacted = content.days.filter(
      d => d.date < newStartDate || d.date > newEndDate,
    );
    if (impacted.length === 0) {
      return true;
    }

    setPendingImpact(impacted);
    return false;
  };

  const dismissImpact = () => setPendingImpact(null);

  return { pendingImpact, checkImpact, dismissImpact };
}
