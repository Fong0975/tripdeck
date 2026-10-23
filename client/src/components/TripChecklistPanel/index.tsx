import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';

import LoadingIndicator from '@/components/ui/LoadingIndicator';

import CheckSaveBar from '../checklist/trip/CheckSaveBar';
import TripChecklistEditModal from '../checklist/trip/TripChecklistEditModal';

import ChecklistTable from './ChecklistTable';
import { useChecklistState } from './useChecklistState';

interface Props {
  tripId: number;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function TripChecklistPanel({ tripId, onDirtyChange }: Props) {
  const [showEditModal, setShowEditModal] = useState(false);
  const {
    checklist,
    loading,
    saving,
    isDirty,
    getCheck,
    handleToggleCheck,
    handleSaveChecks,
    handleDiscardChecks,
    handleEditSaved,
  } = useChecklistState(tripId, onDirtyChange);

  if (loading || !checklist) {
    return (
      <div className='flex flex-1 items-center justify-center py-24'>
        <LoadingIndicator />
      </div>
    );
  }

  if (checklist.categories.length === 0) {
    return (
      <div className='flex flex-1 items-center justify-center py-24 text-center'>
        <div>
          <p className='mb-2 text-4xl'>🧳</p>
          <p className='mb-4 text-sm text-muted-foreground'>
            尚未有任何分類，請點擊「編輯清單」以開始建立行李清單。
          </p>
          <button
            onClick={() => setShowEditModal(true)}
            className='inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary'
          >
            <Plus size={12} />
            編輯清單
          </button>
        </div>
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

  const totalItems = checklist.categories.reduce(
    (sum, c) => sum + c.items.length,
    0,
  );

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      {/* Toolbar */}
      <div className='flex shrink-0 items-center justify-between border-b border-border px-4 py-2'>
        <span className='text-xs text-muted-foreground'>
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

      <ChecklistTable
        checklist={checklist}
        totalItems={totalItems}
        getCheck={getCheck}
        onToggleCheck={handleToggleCheck}
      />

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
