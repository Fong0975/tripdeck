import { DndContext, DragOverlay } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import AttractionCard from '@/components/AttractionCard';
import AttractionModal from '@/components/AttractionModal';
import DayColumn from '@/components/DayColumn';
import Navbar from '@/components/Navbar';
import TravelConnectionModal from '@/components/TravelConnectionModal';
import TripChecklistPanel from '@/components/TripChecklistPanel';
import type { Attraction, TravelConnection } from '@/types';
import { exportToDocx } from '@/utils/exportToDocx';
import {
  addAttraction,
  addConnection,
  addDayLocation,
  deleteAttraction,
  deleteDayLocation,
  duplicateAttraction,
  updateAttraction,
  updateConnection,
  updateDayLocation,
  uploadAttractionImage,
} from '@/utils/storage';

import TripHeader from './TripHeader';
import type { ModalState } from './types';
import { useDragAndDrop } from './useDragAndDrop';
import { useTripData } from './useTripData';

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { trip, content, reloadContent } = useTripData(id);

  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [activeTab, setActiveTab] = useState<'itinerary' | 'checklist'>(
    'itinerary',
  );
  const [exporting, setExporting] = useState(false);
  const [checklistDirty, setChecklistDirty] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const dnd = useDragAndDrop(trip?.id ?? null, content, reloadContent);

  // Guard browser back button when checklist has unsaved changes
  useEffect(() => {
    if (!checklistDirty) {
      return;
    }
    window.history.pushState(null, '');
    const onPopstate = () => {
      window.history.pushState(null, '');
      setShowLeaveConfirm(true);
    };
    window.addEventListener('popstate', onPopstate);
    return () => window.removeEventListener('popstate', onPopstate);
  }, [checklistDirty]);

  const handleBack = () => {
    if (checklistDirty) {
      setShowLeaveConfirm(true);
    } else {
      navigate('/');
    }
  };

  const handleConfirmLeave = () => {
    setShowLeaveConfirm(false);
    navigate('/');
  };

  // --- Export ---

  const handleExport = async () => {
    if (!trip || !content || exporting) {
      return;
    }
    setExporting(true);
    try {
      await exportToDocx(trip, content);
    } finally {
      setExporting(false);
    }
  };

  // --- Attraction CRUD ---

  const handleSaveAttraction = async (
    dayIndex: number,
    attraction: Attraction,
    stagedImages?: { file: File; title: string }[],
  ) => {
    if (!trip || !content) {
      return;
    }
    const day = content.days[dayIndex];
    if (attraction.id === 0) {
      const created = await addAttraction(trip.id, day.id, {
        name: attraction.name,
        googleMapUrl: attraction.googleMapUrl ?? undefined,
        notes: attraction.notes ?? undefined,
        nearbyAttractions: attraction.nearbyAttractions ?? undefined,
        startTime: attraction.startTime ?? undefined,
        endTime: attraction.endTime ?? undefined,
        referenceWebsites: attraction.referenceWebsites,
      });
      if (stagedImages?.length) {
        for (const { file, title } of stagedImages) {
          await uploadAttractionImage(trip.id, created.id, file, title);
        }
      }
    } else {
      await updateAttraction(trip.id, attraction.id, {
        name: attraction.name,
        googleMapUrl: attraction.googleMapUrl ?? null,
        notes: attraction.notes ?? null,
        nearbyAttractions: attraction.nearbyAttractions ?? null,
        startTime: attraction.startTime ?? null,
        endTime: attraction.endTime ?? null,
        referenceWebsites: attraction.referenceWebsites,
      });
    }
    await reloadContent();
    setModal({ type: 'none' });
  };

  const handleDeleteAttraction = async (
    _dayIndex: number,
    attractionId: number,
  ) => {
    if (!trip) {
      return;
    }
    await deleteAttraction(trip.id, attractionId);
    await reloadContent();
  };

  const handleDuplicateAttraction = async (
    _dayIndex: number,
    attraction: Attraction,
  ) => {
    if (!trip) {
      return;
    }
    await duplicateAttraction(trip.id, attraction.id);
    await reloadContent();
  };

  // --- Connection CRUD ---

  const handleAddConnection = (
    dayIndex: number,
    fromId: number,
    toId: number,
  ) => {
    const pending: TravelConnection = {
      id: 0,
      fromAttractionId: fromId,
      toAttractionId: toId,
      transportMode: 'transit',
    };
    setModal({ type: 'editConnection', dayIndex, connection: pending });
  };

  const handleSaveConnection = async (
    dayIndex: number,
    connection: TravelConnection,
  ) => {
    if (!trip || !content) {
      return;
    }
    const day = content.days[dayIndex];
    if (connection.id === 0) {
      await addConnection(trip.id, day.id, {
        fromAttractionId: connection.fromAttractionId,
        toAttractionId: connection.toAttractionId,
        transportMode: connection.transportMode,
        duration: connection.duration ?? undefined,
        route: connection.route ?? undefined,
        notes: connection.notes ?? undefined,
      });
    } else {
      await updateConnection(trip.id, connection.id, {
        transportMode: connection.transportMode,
        duration: connection.duration ?? null,
        route: connection.route ?? null,
        notes: connection.notes ?? null,
      });
    }
    await reloadContent();
    setModal({ type: 'none' });
  };

  // --- Day Locations ---

  const handleAddLocation = async (dayIndex: number, name: string) => {
    if (!trip || !content) {
      return;
    }
    await addDayLocation(trip.id, content.days[dayIndex].id, name);
    await reloadContent();
  };

  const handleUpdateLocation = async (
    _dayIndex: number,
    locationId: number,
    name: string,
  ) => {
    if (!trip) {
      return;
    }
    await updateDayLocation(trip.id, locationId, name);
    await reloadContent();
  };

  const handleDeleteLocation = async (
    _dayIndex: number,
    locationId: number,
  ) => {
    if (!trip) {
      return;
    }
    await deleteDayLocation(trip.id, locationId);
    await reloadContent();
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
        <p className='text-muted-foreground animate-pulse text-sm'>載入中…</p>
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
          <DndContext
            sensors={dnd.sensors}
            onDragStart={dnd.handleDragStart}
            onDragEnd={dnd.handleDragEnd}
          >
            <div className='flex min-w-max gap-4 pb-4'>
              {content.days.map((day, i) => (
                <DayColumn
                  key={day.id}
                  day={day}
                  dayIndex={i}
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
                  onAddConnection={handleAddConnection}
                  onAddLocation={(di, name) => void handleAddLocation(di, name)}
                  onUpdateLocation={(di, locId, name) =>
                    void handleUpdateLocation(di, locId, name)
                  }
                  onDeleteLocation={(di, locId) =>
                    void handleDeleteLocation(di, locId)
                  }
                />
              ))}
            </div>

            <DragOverlay>
              {dnd.activeAttractionId && dnd.getActiveAttraction() && (
                <div className='rotate-2 opacity-90 shadow-xl'>
                  <AttractionCard
                    attraction={dnd.getActiveAttraction()!}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* Modals */}
      {modal.type === 'addAttraction' && (
        <AttractionModal
          tripId={trip.id}
          onClose={() => setModal({ type: 'none' })}
          onSave={(a, staged) =>
            void handleSaveAttraction(modal.dayIndex, a, staged)
          }
        />
      )}

      {modal.type === 'editAttraction' && (
        <AttractionModal
          tripId={trip.id}
          attraction={modal.attraction}
          onClose={() => setModal({ type: 'none' })}
          onSave={a => void handleSaveAttraction(modal.dayIndex, a)}
        />
      )}

      {editConnectionData && (
        <TravelConnectionModal
          tripId={trip.id}
          connection={editConnectionData.connection}
          fromName={editConnectionData.fromName}
          toName={editConnectionData.toName}
          onClose={() => setModal({ type: 'none' })}
          onSave={c =>
            void handleSaveConnection(editConnectionData.dayIndex, c)
          }
        />
      )}

      {/* Leave confirmation when checklist has unsaved changes */}
      {showLeaveConfirm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div className='absolute inset-0 bg-black/50' />
          <div className='bg-card border-border relative w-full max-w-sm rounded-2xl border p-6 shadow-xl'>
            <p className='text-foreground font-semibold'>確定要離開嗎？</p>
            <p className='text-muted-foreground mt-1 text-sm'>
              行李清單有未儲存的勾選變更，離開後將會遺失。
            </p>
            <div className='mt-5 flex items-center justify-end gap-3'>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className='text-muted-foreground hover:text-foreground px-4 py-2 text-sm transition-colors'
              >
                留下
              </button>
              <button
                onClick={handleConfirmLeave}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors'
              >
                確定離開
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
