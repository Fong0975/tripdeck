import { DndContext, DragOverlay } from '@dnd-kit/core';
import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';

import AttractionCard from '@/components/AttractionCard';
import AttractionModal from '@/components/AttractionModal';
import DayColumn from '@/components/DayColumn';
import Navbar from '@/components/Navbar';
import TravelConnectionModal from '@/components/TravelConnectionModal';
import TripChecklistPanel from '@/components/TripChecklistPanel';
import type { Attraction, TravelConnection, TripContent } from '@/types';
import { saveTripContent } from '@/utils/storage';

import TripHeader from './TripHeader';
import type { ModalState } from './types';
import { useDragAndDrop } from './useDragAndDrop';
import { useTripData } from './useTripData';

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { trip, content, setContent, refreshing, handleForceRefresh } =
    useTripData(id);

  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [activeTab, setActiveTab] = useState<'itinerary' | 'checklist'>(
    'itinerary',
  );

  const updateContent = useCallback(
    (updater: (prev: TripContent) => TripContent) => {
      setContent(prev => {
        if (!prev) {
          return prev;
        }
        const next = updater(prev);
        void saveTripContent(next);
        return next;
      });
    },
    [setContent],
  );

  const dnd = useDragAndDrop(content, updateContent);

  // --- Attraction CRUD ---

  const handleSaveAttraction = (dayIndex: number, attraction: Attraction) => {
    updateContent(prev => ({
      ...prev,
      days: prev.days.map((day, i) => {
        if (i !== dayIndex) {
          return day;
        }
        const exists = day.attractions.find(a => a.id === attraction.id);
        return {
          ...day,
          attractions: exists
            ? day.attractions.map(a =>
                a.id === attraction.id ? attraction : a,
              )
            : [...day.attractions, attraction],
        };
      }),
    }));
    setModal({ type: 'none' });
  };

  const handleDeleteAttraction = (dayIndex: number, attractionId: string) => {
    updateContent(prev => ({
      ...prev,
      days: prev.days.map((day, i) => {
        if (i !== dayIndex) {
          return day;
        }
        return {
          ...day,
          attractions: day.attractions.filter(a => a.id !== attractionId),
          connections: day.connections.filter(
            c =>
              c.fromAttractionId !== attractionId &&
              c.toAttractionId !== attractionId,
          ),
        };
      }),
    }));
  };

  // --- Connection CRUD ---

  const handleAddConnection = (
    dayIndex: number,
    fromId: string,
    toId: string,
  ) => {
    const newConn: TravelConnection = {
      id: uuid(),
      fromAttractionId: fromId,
      toAttractionId: toId,
      transportMode: 'transit',
    };
    updateContent(prev => ({
      ...prev,
      days: prev.days.map((day, i) =>
        i === dayIndex
          ? { ...day, connections: [...day.connections, newConn] }
          : day,
      ),
    }));
    setModal({ type: 'editConnection', dayIndex, connection: newConn });
  };

  const handleSaveConnection = (
    dayIndex: number,
    connection: TravelConnection,
  ) => {
    updateContent(prev => ({
      ...prev,
      days: prev.days.map((day, i) => {
        if (i !== dayIndex) {
          return day;
        }
        const exists = day.connections.find(c => c.id === connection.id);
        return {
          ...day,
          connections: exists
            ? day.connections.map(c =>
                c.id === connection.id ? connection : c,
              )
            : [...day.connections, connection],
        };
      }),
    }));
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
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <p className='animate-pulse text-sm text-muted-foreground'>載入中…</p>
      </div>
    );
  }

  return (
    <div className='flex min-h-screen flex-col bg-background'>
      <Navbar />

      <TripHeader
        trip={trip}
        refreshing={refreshing}
        onBack={() => navigate('/')}
        onRefresh={() => void handleForceRefresh()}
      />

      {/* Tab bar */}
      <div className='border-b border-border bg-background'>
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
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'checklist' ? (
        <TripChecklistPanel tripId={trip.id} />
      ) : (
        /* Board */
        <div className='flex-1 overflow-x-auto px-4 py-6'>
          <DndContext
            sensors={dnd.sensors}
            onDragStart={dnd.handleDragStart}
            onDragEnd={dnd.handleDragEnd}
          >
            <div className='flex min-w-max gap-4 pb-4'>
              {content.days.map((day, i) => (
                <DayColumn
                  key={day.day}
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
                  onDeleteAttraction={handleDeleteAttraction}
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
          onClose={() => setModal({ type: 'none' })}
          onSave={a => handleSaveAttraction(modal.dayIndex, a)}
        />
      )}

      {modal.type === 'editAttraction' && (
        <AttractionModal
          attraction={modal.attraction}
          onClose={() => setModal({ type: 'none' })}
          onSave={a => handleSaveAttraction(modal.dayIndex, a)}
        />
      )}

      {editConnectionData && (
        <TravelConnectionModal
          connection={editConnectionData.connection}
          fromName={editConnectionData.fromName}
          toName={editConnectionData.toName}
          onClose={() => setModal({ type: 'none' })}
          onSave={c => handleSaveConnection(editConnectionData.dayIndex, c)}
        />
      )}
    </div>
  );
}
