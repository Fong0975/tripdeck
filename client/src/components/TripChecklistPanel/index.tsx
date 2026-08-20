import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';

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
        <p className='text-muted-foreground animate-pulse text-sm'>載入中…</p>
      </div>
    );
  }

  if (checklist.categories.length === 0) {
    return (
      <div className='flex flex-1 items-center justify-center py-24 text-center'>
        <div>
          <p className='mb-2 text-4xl'>🧳</p>
          <p className='text-muted-foreground mb-4 text-sm'>
            尚未有任何分類，請點擊「編輯清單」以開始建立行李清單。
          </p>
          <button
            onClick={() => setShowEditModal(true)}
            className='border-border text-muted-foreground hover:border-primary hover:text-primary inline-flex items-center gap-1 rounded-lg border border-dashed px-3 py-1.5 text-xs transition-colors'
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
      <div className='border-border flex shrink-0 items-center justify-between border-b px-4 py-2'>
        <span className='text-muted-foreground text-xs'>
          共 {totalItems} 項
        </span>
        <button
          onClick={() => setShowEditModal(true)}
          className='text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors'
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
