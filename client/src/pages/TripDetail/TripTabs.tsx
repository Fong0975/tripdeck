import type { TripTab } from './useTripTabs';

const TABS: readonly { key: TripTab; label: string }[] = [
  { key: 'itinerary', label: '行程規劃' },
  { key: 'checklist', label: '行李清單' },
];

interface Props {
  activeTab: TripTab;
  onSelect: (tab: TripTab) => void;
}

/**
 * Tab bar switching the trip detail page between the itinerary board and
 * the packing checklist.
 *
 * @param activeTab - The currently shown tab, rendered as highlighted.
 * @param onSelect - Called with the clicked tab (including the active one).
 */
export default function TripTabs({ activeTab, onSelect }: Props) {
  return (
    <div className='border-b border-border bg-background'>
      <div className='mx-auto flex max-w-7xl px-4'>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
