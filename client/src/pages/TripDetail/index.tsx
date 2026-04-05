import { DndContext, DragOverlay } from '@dnd-kit/core';
import { useState } from 'react';
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
  deleteAttraction,
  updateAttraction,
  updateConnection,
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

  const dnd = useDragAndDrop(trip?.id ?? null, content, reloadContent);

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
  ) => {
    if (!trip || !content) {
      return;
    }
    const day = content.days[dayIndex];
    if (attraction.id === 0) {
      await addAttraction(trip.id, day.id, {
        name: attraction.name,
        googleMapUrl: attraction.googleMapUrl ?? undefined,
        notes: attraction.notes ?? undefined,
        nearbyAttractions: attraction.nearbyAttractions ?? undefined,
        startTime: attraction.startTime ?? undefined,
        endTime: attraction.endTime ?? undefined,
        referenceWebsites: attraction.referenceWebsites,
      });
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
        onBack={() => navigate('/')}
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
          <TripChecklistPanel tripId={trip.id} />
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
                  onEditConnection={(di, c) =>
                    setModal({
                      type: 'editConnection',
                      dayIndex: di,
                      connection: c,
                    })
                  }
                  onAddConnection={handleAddConnection}
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
          onSave={a => void handleSaveAttraction(modal.dayIndex, a)}
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
    </div>
  );
}
