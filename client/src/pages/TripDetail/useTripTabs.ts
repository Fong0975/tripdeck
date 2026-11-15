import { useState } from 'react';

export type TripTab = 'itinerary' | 'checklist';

/**
 * Tracks the trip detail page's active tab, holding back a switch away from
 * the checklist tab while it has unsaved checks (leaving unmounts the panel
 * and would silently drop them) until the user confirms via
 * `confirmTabSwitch` or cancels via `cancelTabSwitch`.
 *
 * @param checklistDirty Whether the checklist panel has unsaved checks.
 */
export function useTripTabs(checklistDirty: boolean) {
  const [activeTab, setActiveTab] = useState<TripTab>('itinerary');
  const [pendingTab, setPendingTab] = useState<TripTab | null>(null);

  const requestTab = (tab: TripTab) => {
    if (tab === activeTab) {
      return;
    }
    if (activeTab === 'checklist' && checklistDirty) {
      setPendingTab(tab);
      return;
    }
    setActiveTab(tab);
  };

  const confirmTabSwitch = () => {
    if (pendingTab) {
      setActiveTab(pendingTab);
    }
    setPendingTab(null);
  };

  const cancelTabSwitch = () => setPendingTab(null);

  return {
    activeTab,
    requestTab,
    showDiscardConfirm: pendingTab !== null,
    confirmTabSwitch,
    cancelTabSwitch,
  };
}
