import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import AttractionModal from '@/components/AttractionModal';
import DayMapModal from '@/components/DayMapModal';
import EditDayNoteModal from '@/components/EditDayNoteModal';
import EditTripModal from '@/components/EditTripModal';
import Navbar from '@/components/Navbar';
import TravelConnectionModal from '@/components/TravelConnectionModal';
import TripChecklistPanel from '@/components/TripChecklistPanel';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import RetryableError from '@/components/ui/RetryableError';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { showToast } from '@/lib/toast';

import ItineraryBoard from './ItineraryBoard';
import TripHeader from './TripHeader';
import type { ModalState } from './types';
import { useAttractionActions } from './useAttractionActions';
import { useConnectionActions } from './useConnectionActions';
import { useDayLocationActions } from './useDayLocationActions';
import { useDayNoteActions } from './useDayNoteActions';
import { useDragAndDrop } from './useDragAndDrop';
import { useTripData } from './useTripData';
import { useTripTabs } from './useTripTabs';

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    trip,
    content,
    reloadContent,
    reloadTrip,
    setTrip,
    loadError,
    retryLoad,
  } = useTripData(id);
  const handleImagesChanged = () => void reloadContent();

  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [exporting, setExporting] = useState(false);
  const [checklistDirty, setChecklistDirty] = useState(false);
  const {
    activeTab,
    requestTab,
    showDiscardConfirm,
    confirmTabSwitch,
    cancelTabSwitch,
  } = useTripTabs(checklistDirty);
  const [showEditTrip, setShowEditTrip] = useState(false);

  const dnd = useDragAndDrop(trip?.id ?? null, content, reloadContent);

  const closeModal = () => setModal({ type: 'none' });

  const {
    handleSaveAttraction,
    handleDeleteAttraction,
    handleDuplicateAttraction,
  } = useAttractionActions(trip, content, reloadContent, closeModal);

  const { handleAddConnection, handleSaveConnection, handleDeleteConnection } =
    useConnectionActions(
      trip,
      content,
      reloadContent,
      closeModal,
      (dayIndex, connection) =>
        setModal({ type: 'editConnection', dayIndex, connection }),
    );

  const { handleAddLocation, handleUpdateLocation, handleDeleteLocation } =
    useDayLocationActions(trip, content, reloadContent);

  const { handleSaveDayNotes } = useDayNoteActions(
    trip,
    content,
    reloadContent,
    closeModal,
  );

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
      showToast('success', '已匯出 Word 文件。');
    } catch {
      showToast('error', '匯出 Word 文件失敗，請稍後再試');
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

  if (loadError) {
    return (
      <RetryableError
        message='載入旅程資料失敗，請稍後再試'
        onRetry={() => void retryLoad()}
        className='min-h-screen bg-background p-4'
      />
    );
  }

  if (!trip || !content) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <div className='flex h-dvh flex-col overflow-hidden bg-background'>
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
      <div className='border-b border-border bg-background'>
        <div className='mx-auto flex max-w-7xl px-4'>
          {(
            [
              { key: 'itinerary', label: '行程規劃' },
              { key: 'checklist', label: '行李清單' },
            ] as const
          ).map(tab => (
            <button
              key={tab.key}
              onClick={() => requestTab(tab.key)}
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

      {activeTab === 'checklist' ? (
        <div className='flex min-h-0 flex-1 flex-col px-0 sm:px-8 xl:px-16'>
          <TripChecklistPanel
            tripId={trip.id}
            onDirtyChange={setChecklistDirty}
          />
        </div>
      ) : (
        /* Board */
        <div className='min-h-0 flex-1 overflow-auto'>
          <div className='px-4 py-6 sm:px-8 xl:px-16'>
            <ItineraryBoard
              days={content.days}
              sensors={dnd.sensors}
              onDragStart={dnd.handleDragStart}
              onDragEnd={dnd.handleDragEnd}
              activeAttractionId={dnd.activeAttractionId}
              getActiveAttraction={dnd.getActiveAttraction}
              onEditDayNote={di =>
                setModal({ type: 'editDayNote', dayIndex: di })
              }
              onOpenDayMap={di => setModal({ type: 'dayMap', dayIndex: di })}
              onAddAttraction={di =>
                setModal({ type: 'addAttraction', dayIndex: di })
              }
              onEditAttraction={(di, a) =>
                setModal({
                  type: 'editAttraction',
                  dayIndex: di,
                  attraction: a,
                })
              }
              onDeleteAttraction={(di, aId) =>
                void handleDeleteAttraction(di, aId)
              }
              onDuplicateAttraction={(di, a) =>
                void handleDuplicateAttraction(di, a)
              }
              onEditConnection={(di, c) =>
                setModal({
                  type: 'editConnection',
                  dayIndex: di,
                  connection: c,
                })
              }
              onDeleteConnection={(di, cId) =>
                void handleDeleteConnection(di, cId)
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
        </div>
      )}

      {/* Modals */}
      {modal.type === 'addAttraction' && (
        <AttractionModal
          tripId={trip.id}
          onClose={closeModal}
          onSave={(a, staged) =>
            handleSaveAttraction(modal.dayIndex, a, staged)
          }
          onImagesChanged={handleImagesChanged}
        />
      )}

      {modal.type === 'editAttraction' && (
        <AttractionModal
          tripId={trip.id}
          attraction={modal.attraction}
          onClose={closeModal}
          onSave={a => handleSaveAttraction(modal.dayIndex, a)}
          onImagesChanged={handleImagesChanged}
        />
      )}

      {editConnectionData && (
        <TravelConnectionModal
          tripId={trip.id}
          connection={editConnectionData.connection}
          fromName={editConnectionData.fromName}
          toName={editConnectionData.toName}
          onClose={closeModal}
          onSave={(c, staged) =>
            handleSaveConnection(editConnectionData.dayIndex, c, staged)
          }
          onImagesChanged={handleImagesChanged}
        />
      )}

      {modal.type === 'editDayNote' && (
        <EditDayNoteModal
          tripId={trip.id}
          day={content.days[modal.dayIndex]}
          onClose={() => {
            closeModal();
            void reloadContent();
          }}
          onSave={notes => handleSaveDayNotes(modal.dayIndex, notes)}
        />
      )}

      {modal.type === 'dayMap' && (
        <DayMapModal
          tripId={trip.id}
          days={content.days}
          initialDayIndex={modal.dayIndex}
          onClose={closeModal}
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
          onImagesChanged={() => void reloadTrip()}
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

      {/* Tab-switch confirmation when the checklist has unsaved checks */}
      {showDiscardConfirm && (
        <ConfirmDialog
          title='確定要切換分頁嗎？'
          message='清單有尚未儲存的勾選，確定要離開嗎？'
          cancelLabel='留下'
          confirmLabel='確定離開'
          onCancel={cancelTabSwitch}
          onConfirm={confirmTabSwitch}
        />
      )}

      {/* Move confirmation when the dragged card would break an existing connection */}
      {dnd.showMoveConfirm && (
        <ConfirmDialog
          title='確定要移動這張卡片嗎？'
          message='移動後，部分卡片之間已設定的交通方式將不再相鄰，並會被一併移除，確定要繼續嗎？'
          cancelLabel='取消'
          confirmLabel='確定移動'
          onCancel={dnd.cancelMove}
          onConfirm={dnd.confirmMove}
        />
      )}
    </div>
  );
}
