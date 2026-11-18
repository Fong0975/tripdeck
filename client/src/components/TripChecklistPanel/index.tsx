import { Pencil } from 'lucide-react';
import { useState } from 'react';

import LoadingIndicator from '@/components/ui/LoadingIndicator';
import RetryableError from '@/components/ui/RetryableError';

import CheckSaveBar from '../Checklist/trip/CheckSaveBar';
import TripChecklistEditModal from '../Checklist/trip/TripChecklistEditModal';

import ChecklistTable from './ChecklistTable';
import EmptyChecklistState from './EmptyChecklistState';
import { useChecklistState } from './useChecklistState';
import { useChecklistView } from './useChecklistView';
import { useIncompleteOnly } from './useIncompleteOnly';
import ViewSettingsMenu from './ViewSettingsMenu';

interface Props {
  tripId: number;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function TripChecklistPanel({ tripId, onDirtyChange }: Props) {
  const [showEditModal, setShowEditModal] = useState(false);
  const {
    checklist,
    loading,
    loadError,
    retryLoad,
    saving,
    syncing,
    handleSyncTemplate,
    isDirty,
    getCheck,
    getSpecCheck,
    handleToggleCheck,
    handleToggleSpecCheck,
    handleSaveChecks,
    handleDiscardChecks,
    handleEditSaved,
  } = useChecklistState(tripId, onDirtyChange);
  const view = useChecklistView(checklist?.categories, checklist?.occasions);
  const incomplete = useIncompleteOnly({
    enabled: view.incompleteOnly,
    occasions: view.visibleOccasions,
    units: view.filteredUnits,
    getCheck,
    getSpecCheck,
    onToggleCheck: handleToggleCheck,
    onToggleSpecCheck: handleToggleSpecCheck,
  });

  if (loadError) {
    return (
      <RetryableError
        message='載入行李清單失敗，請稍後再試'
        onRetry={() => void retryLoad()}
        className='flex-1 py-24'
      />
    );
  }

  if (loading || !checklist) {
    return (
      <div className='flex flex-1 items-center justify-center py-24'>
        <LoadingIndicator />
      </div>
    );
  }

  if (checklist.categories.length === 0) {
    return (
      <>
        <EmptyChecklistState
          syncing={syncing}
          onSyncTemplate={() => void handleSyncTemplate()}
          onEdit={() => setShowEditModal(true)}
        />
        {showEditModal && (
          <TripChecklistEditModal
            tripId={tripId}
            checklist={checklist}
            onClose={() => setShowEditModal(false)}
            onSaved={() => void handleEditSaved()}
          />
        )}
      </>
    );
  }

  const totalItems = checklist.categories.reduce(
    (sum, c) => sum + c.items.length,
    0,
  );

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      {/* Toolbar */}
      <div className='shrink-0 border-b border-border px-4 py-2'>
        <div className='mx-auto flex max-w-5xl items-center justify-between'>
          <ViewSettingsMenu
            viewMode={view.viewMode}
            onViewModeChange={view.changeViewMode}
            groups={view.groups}
            hidden={view.hidden}
            occasions={view.occasions}
            hiddenOccasionIds={view.hiddenOccasionIds}
            onToggleOccasion={view.toggleOccasion}
            incompleteOnly={view.incompleteOnly}
            onIncompleteOnlyChange={view.setIncompleteOnly}
            onToggleItem={view.toggleItem}
            onToggleGroup={view.toggleGroup}
            onClearFilter={view.clearFilter}
          />
          <div className='flex items-center gap-3'>
            <span className='text-sm text-muted-foreground'>
              共 {totalItems} 項
            </span>
            <button
              onClick={() => setShowEditModal(true)}
              className='flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
            >
              <Pencil size={14} />
              編輯清單
            </button>
          </div>
        </div>
      </div>

      {incomplete.allFinished ? (
        <div className='flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center'>
          <p className='text-sm text-muted-foreground'>所有項目都已完成 🎉</p>
          <button
            type='button'
            onClick={() => view.setIncompleteOnly(false)}
            className='rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted'
          >
            顯示全部項目
          </button>
        </div>
      ) : view.allHidden ? (
        <div className='flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center'>
          <p className='text-sm text-muted-foreground'>沒有符合篩選的項目</p>
          <button
            type='button'
            onClick={view.clearFilter}
            className='rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted'
          >
            清除篩選
          </button>
        </div>
      ) : (
        <ChecklistTable
          checklist={{ ...checklist, occasions: view.visibleOccasions }}
          getCheck={getCheck}
          getSpecCheck={getSpecCheck}
          onToggleCheck={incomplete.toggleCheck}
          onToggleSpecCheck={incomplete.toggleSpecCheck}
          viewMode={view.viewMode}
          hidden={view.hidden}
          isUnitVisible={incomplete.isUnitVisible}
        />
      )}

      {/* Floating save/discard bar */}
      {isDirty && (
        <CheckSaveBar
          saving={saving}
          onSave={() => void handleSaveChecks()}
          onDiscard={handleDiscardChecks}
        />
      )}

      {/* Edit modal */}
      {showEditModal && (
        <TripChecklistEditModal
          tripId={tripId}
          checklist={checklist}
          onClose={() => setShowEditModal(false)}
          onSaved={() => void handleEditSaved()}
        />
      )}
    </div>
  );
}
