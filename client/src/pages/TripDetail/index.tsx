import { useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Navbar from '@/components/Navbar';
import TripChecklistPanel from '@/components/TripChecklistPanel';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import RetryableError from '@/components/ui/RetryableError';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import type { TravelConnection } from '@/types';

import ItineraryBoard from './ItineraryBoard';
import TripHeader from './TripHeader';
import TripModals from './TripModals';
import TripTabs from './TripTabs';
import type { ModalState } from './types';
import { useAttractionActions } from './useAttractionActions';
import { useBoardHandlers } from './useBoardHandlers';
import { useConnectionActions } from './useConnectionActions';
import { useDayLocationActions } from './useDayLocationActions';
import { useDayNoteActions } from './useDayNoteActions';
import { useDragAndDrop } from './useDragAndDrop';
import { useTripData } from './useTripData';
import { useTripExport } from './useTripExport';
import { useTripTabs } from './useTripTabs';

/**
 * Trip detail page: composes the trip data, mutation hooks, tab bar,
 * itinerary board / checklist panel, modals and confirmation dialogs.
 */
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

  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const closeModal = useCallback(() => setModal({ type: 'none' }), []);
  const openConnectionModal = useCallback(
    (dayIndex: number, connection: TravelConnection) =>
      setModal({ type: 'editConnection', dayIndex, connection }),
    [],
  );

  const [checklistDirty, setChecklistDirty] = useState(false);
  const {
    activeTab,
    requestTab,
    showDiscardConfirm,
    confirmTabSwitch,
    cancelTabSwitch,
  } = useTripTabs(checklistDirty);
  const { showLeaveConfirm, guardedLeave, confirmLeave, cancelLeave } =
    useUnsavedChangesGuard(checklistDirty, () => navigate('/'));

  const { exporting, handleExport } = useTripExport(trip, content);
  const dnd = useDragAndDrop(trip?.id ?? null, content, reloadContent);

  const attractionActions = useAttractionActions(
    trip,
    content,
    reloadContent,
    closeModal,
  );
  const connectionActions = useConnectionActions(
    trip,
    content,
    reloadContent,
    closeModal,
    openConnectionModal,
  );
  const locationActions = useDayLocationActions(trip, content, reloadContent);
  const { handleSaveDayNotes } = useDayNoteActions(
    trip,
    content,
    reloadContent,
    closeModal,
  );

  const boardHandlers = useBoardHandlers(setModal, {
    deleteAttraction: attractionActions.handleDeleteAttraction,
    duplicateAttraction: attractionActions.handleDuplicateAttraction,
    addConnection: connectionActions.handleAddConnection,
    deleteConnection: connectionActions.handleDeleteConnection,
    addLocation: locationActions.handleAddLocation,
    updateLocation: locationActions.handleUpdateLocation,
    deleteLocation: locationActions.handleDeleteLocation,
  });

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
        onBack={guardedLeave}
        onExport={() => setModal({ type: 'export' })}
        onOpenTimeline={() => setModal({ type: 'timeline' })}
        onEdit={() => setModal({ type: 'editTrip' })}
        exporting={exporting}
      />

      <TripTabs activeTab={activeTab} onSelect={requestTab} />

      {activeTab === 'checklist' ? (
        <div className='flex min-h-0 flex-1 flex-col px-0 sm:px-8 xl:px-16'>
          <TripChecklistPanel
            tripId={trip.id}
            onDirtyChange={setChecklistDirty}
          />
        </div>
      ) : (
        <div className='min-h-0 flex-1 overflow-auto'>
          <div className='px-4 py-6 sm:px-8 xl:px-16'>
            <ItineraryBoard
              days={content.days}
              sensors={dnd.sensors}
              onDragStart={dnd.handleDragStart}
              onDragEnd={dnd.handleDragEnd}
              activeAttractionId={dnd.activeAttractionId}
              getActiveAttraction={dnd.getActiveAttraction}
              {...boardHandlers}
            />
          </div>
        </div>
      )}

      <TripModals
        trip={trip}
        content={content}
        modal={modal}
        onClose={closeModal}
        onSaveAttraction={attractionActions.handleSaveAttraction}
        onSaveConnection={connectionActions.handleSaveConnection}
        onSaveDayNotes={handleSaveDayNotes}
        onConfirmExport={options => {
          closeModal();
          void handleExport(options);
        }}
        onTripUpdated={setTrip}
        reloadContent={reloadContent}
        reloadTrip={reloadTrip}
      />

      {/* Leave confirmation when checklist has unsaved changes */}
      {showLeaveConfirm && (
        <ConfirmDialog
          title='確定要離開嗎？'
          message='行李清單有未儲存的勾選變更，離開後將會遺失。'
          cancelLabel='留下'
          confirmLabel='確定離開'
          onCancel={cancelLeave}
          onConfirm={confirmLeave}
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
