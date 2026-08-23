import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import AttractionModal from '@/components/AttractionModal';
import EditTripModal from '@/components/EditTripModal';
import Navbar from '@/components/Navbar';
import TravelConnectionModal from '@/components/TravelConnectionModal';
import TripChecklistPanel from '@/components/TripChecklistPanel';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

import ItineraryBoard from './ItineraryBoard';
import TripHeader from './TripHeader';
import type { ModalState } from './types';
import { useAttractionActions } from './useAttractionActions';
import { useConnectionActions } from './useConnectionActions';
import { useDayLocationActions } from './useDayLocationActions';
import { useDragAndDrop } from './useDragAndDrop';
import { useTripData } from './useTripData';

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { trip, content, reloadContent, setTrip } = useTripData(id);

  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [activeTab, setActiveTab] = useState<'itinerary' | 'checklist'>(
    'itinerary',
  );
  const [exporting, setExporting] = useState(false);
  const [checklistDirty, setChecklistDirty] = useState(false);
  const [showEditTrip, setShowEditTrip] = useState(false);

  const dnd = useDragAndDrop(trip?.id ?? null, content, reloadContent);

  const closeModal = () => setModal({ type: 'none' });

  const {
    handleSaveAttraction,
    handleDeleteAttraction,
    handleDuplicateAttraction,
  } = useAttractionActions(trip, content, reloadContent, closeModal);

  const { handleAddConnection, handleSaveConnection } = useConnectionActions(
    trip,
    content,
    reloadContent,
    closeModal,
    (dayIndex, connection) =>
      setModal({ type: 'editConnection', dayIndex, connection }),
  );

  const { handleAddLocation, handleUpdateLocation, handleDeleteLocation } =
    useDayLocationActions(trip, content, reloadContent);

  const {
    showLeaveConfirm,
    guardedLeave: handleBack,
    confirmLeave: handleConfirmLeave,
    cancelLeave,
  } = useUnsavedChangesGuard(checklistDirty, () => navigate('/'));

  // --- Export ---

  const handleExport = async () => {
    if (!trip || !content || exporting) {
      return;
    }
    setExporting(true);
    try {
      const { exportToDocx } = await import('@/utils/exportToDocx');
      await exportToDocx(trip, content);
    } finally {
      setExporting(false);
    }
  };

  // --- Derived modal data ---

  const editConnectionData =
    modal.type === 'editConnection' && content
      ? {
          connection: modal.connection,
          dayIndex: modal.dayIndex,
          fromName:
            content.days[modal.dayIndex].attractions.find(
              a => a.id === modal.connection.fromAttractionId,
            )?.name ?? '',
          toName:
            content.days[modal.dayIndex].attractions.find(
              a => a.id === modal.connection.toAttractionId,
            )?.name ?? '',
        }
      : null;

  if (!trip || !content) {
    return (
      <div className='bg-background flex min-h-screen items-center justify-center'>
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <div className='bg-background flex min-h-screen flex-col'>
      <Navbar />

      <TripHeader
        trip={trip}
        onBack={handleBack}
        onExport={() => void handleExport()}
        onEdit={() => {
          closeModal();
          setShowEditTrip(true);
        }}
        exporting={exporting}
      />

      {/* Tab bar */}
      <div className='border-border bg-background border-b'>
        <div className='mx-auto flex max-w-screen-xl px-4'>
          {(
            [
              { key: 'itinerary', label: '行程規劃' },
              { key: 'checklist', label: '行李清單' },
            ] as const
          ).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'checklist' ? (
        <div className='flex flex-1 flex-col px-0 sm:px-8 xl:px-16'>
          <TripChecklistPanel
            tripId={trip.id}
            onDirtyChange={setChecklistDirty}
          />
        </div>
      ) : (
        /* Board */
        <div className='flex-1 overflow-x-auto px-4 py-6 sm:px-8 xl:px-16'>
          <ItineraryBoard
            days={content.days}
            sensors={dnd.sensors}
            onDragStart={dnd.handleDragStart}
            onDragEnd={dnd.handleDragEnd}
            activeAttractionId={dnd.activeAttractionId}
            getActiveAttraction={dnd.getActiveAttraction}
            onAddAttraction={di =>
              setModal({ type: 'addAttraction', dayIndex: di })
            }
            onEditAttraction={(di, a) =>
              setModal({ type: 'editAttraction', dayIndex: di, attraction: a })
            }
            onDeleteAttraction={(di, aId) =>
              void handleDeleteAttraction(di, aId)
            }
            onDuplicateAttraction={(di, a) =>
              void handleDuplicateAttraction(di, a)
            }
            onEditConnection={(di, c) =>
              setModal({ type: 'editConnection', dayIndex: di, connection: c })
            }
            onAddConnection={handleAddConnection}
            onAddLocation={(di, name) => void handleAddLocation(di, name)}
            onUpdateLocation={(di, locId, name) =>
              void handleUpdateLocation(di, locId, name)
            }
            onDeleteLocation={(di, locId) =>
              void handleDeleteLocation(di, locId)
            }
          />
        </div>
      )}

      {/* Modals */}
      {modal.type === 'addAttraction' && (
        <AttractionModal
          tripId={trip.id}
          onClose={closeModal}
          onSave={(a, staged) =>
            void handleSaveAttraction(modal.dayIndex, a, staged)
          }
        />
      )}

      {modal.type === 'editAttraction' && (
        <AttractionModal
          tripId={trip.id}
          attraction={modal.attraction}
          onClose={closeModal}
          onSave={a => void handleSaveAttraction(modal.dayIndex, a)}
        />
      )}

      {editConnectionData && (
        <TravelConnectionModal
          tripId={trip.id}
          connection={editConnectionData.connection}
          fromName={editConnectionData.fromName}
          toName={editConnectionData.toName}
          onClose={closeModal}
          onSave={c =>
            void handleSaveConnection(editConnectionData.dayIndex, c)
          }
        />
      )}

      {showEditTrip && (
        <EditTripModal
          trip={trip}
          initialContent={content}
          onClose={() => setShowEditTrip(false)}
          onUpdated={updated => {
            setTrip(updated);
            setShowEditTrip(false);
          }}
          onContentChanged={() => void reloadContent()}
        />
      )}

      {/* Leave confirmation when checklist has unsaved changes */}
      {showLeaveConfirm && (
        <ConfirmDialog
          title='確定要離開嗎？'
          message='行李清單有未儲存的勾選變更，離開後將會遺失。'
          cancelLabel='留下'
          confirmLabel='確定離開'
          onCancel={cancelLeave}
          onConfirm={handleConfirmLeave}
        />
      )}

      {/* Move confirmation when the dragged card would break an existing connection */}
      {dnd.showMoveConfirm && (
        <ConfirmDialog
          title='確定要移動這張卡片嗎？'
          message='此景點與相鄰卡片之間已設定交通方式，移動後該筆交通方式將會被移除，確定要繼續嗎？'
          cancelLabel='取消'
          confirmLabel='確定移動'
          onCancel={dnd.cancelMove}
          onConfirm={dnd.confirmMove}
        />
      )}
    </div>
  );
}
