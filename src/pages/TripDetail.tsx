import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';

import AttractionCard from '@/components/AttractionCard';
import AttractionModal from '@/components/AttractionModal';
import DayColumn from '@/components/DayColumn';
import Navbar from '@/components/Navbar';
import TravelConnectionModal from '@/components/TravelConnectionModal';
import type { Trip, TripContent, Attraction, TravelConnection } from '@/types';
import {
  getTrips,
  getOrInitTripContent,
  saveTripContent,
} from '@/utils/storage';

type ModalState =
  | { type: 'none' }
  | { type: 'addAttraction'; dayIndex: number }
  | { type: 'editAttraction'; dayIndex: number; attraction: Attraction }
  | { type: 'editConnection'; dayIndex: number; connection: TravelConnection };

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [content, setContent] = useState<TripContent | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [activeAttractionId, setActiveAttractionId] = useState<string | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    if (!id) {
      return;
    }
    const found = getTrips().find(t => t.id === id);
    if (!found) {
      navigate('/');
      return;
    }
    setTrip(found);
    setContent(getOrInitTripContent(found));
  }, [id, navigate]);

  const updateContent = useCallback(
    (updater: (prev: TripContent) => TripContent) => {
      setContent(prev => {
        if (!prev) {
          return prev;
        }
        const next = updater(prev);
        saveTripContent(next);
        return next;
      });
    },
    [],
  );

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

  // --- Drag & Drop ---

  const findDayIndexByAttractionId = (attractionId: string): number => {
    if (!content) {
      return -1;
    }
    return content.days.findIndex(d =>
      d.attractions.some(a => a.id === attractionId),
    );
  };

  const findDayIndexByDroppableId = (droppableId: string): number => {
    const match = droppableId.match(/^day-(\d+)$/);
    return match ? parseInt(match[1], 10) : -1;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveAttractionId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveAttractionId(null);
    const { active, over } = event;
    if (!over || !content) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceDayIdx = findDayIndexByAttractionId(activeId);
    if (sourceDayIdx === -1) {
      return;
    }

    // Check if over another attraction card or a day column
    const targetDayIdx = overId.startsWith('day-')
      ? findDayIndexByDroppableId(overId)
      : findDayIndexByAttractionId(overId);

    if (targetDayIdx === -1) {
      return;
    }

    if (sourceDayIdx === targetDayIdx) {
      // Reorder within same day
      const day = content.days[sourceDayIdx];
      const oldIdx = day.attractions.findIndex(a => a.id === activeId);
      const newIdx = day.attractions.findIndex(a => a.id === overId);
      if (oldIdx === newIdx || newIdx === -1) {
        return;
      }

      updateContent(prev => ({
        ...prev,
        days: prev.days.map((d, i) =>
          i === sourceDayIdx
            ? { ...d, attractions: arrayMove(d.attractions, oldIdx, newIdx) }
            : d,
        ),
      }));
    } else {
      // Move to different day
      const sourceDay = content.days[sourceDayIdx];
      const attraction = sourceDay.attractions.find(a => a.id === activeId);
      if (!attraction) {
        return;
      }

      updateContent(prev => ({
        ...prev,
        days: prev.days.map((day, i) => {
          if (i === sourceDayIdx) {
            return {
              ...day,
              attractions: day.attractions.filter(a => a.id !== activeId),
              connections: day.connections.filter(
                c =>
                  c.fromAttractionId !== activeId &&
                  c.toAttractionId !== activeId,
              ),
            };
          }
          if (i === targetDayIdx) {
            return { ...day, attractions: [...day.attractions, attraction] };
          }
          return day;
        }),
      }));
    }
  };

  const getActiveAttraction = (): Attraction | undefined => {
    if (!activeAttractionId || !content) {
      return undefined;
    }
    for (const day of content.days) {
      const found = day.attractions.find(a => a.id === activeAttractionId);
      if (found) {
        return found;
      }
    }
    return undefined;
  };

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
        <p className='text-muted-foreground'>載入中...</p>
      </div>
    );
  }

  const totalDays = content.days.length;
  const dateRange = `${format(parseISO(trip.startDate), 'yyyy/MM/dd', { locale: zhTW })} – ${format(parseISO(trip.endDate), 'yyyy/MM/dd', { locale: zhTW })}`;

  return (
    <div className='flex min-h-screen flex-col bg-background'>
      <Navbar />

      {/* Trip header */}
      <div className='border-b border-border bg-card/50'>
        <div className='mx-auto flex max-w-screen-xl items-center gap-4 p-4'>
          <button
            onClick={() => navigate('/')}
            className='rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
            aria-label='返回首頁'
          >
            <ArrowLeft size={20} />
          </button>
          <div className='min-w-0 flex-1'>
            <h1 className='truncate text-xl font-bold text-foreground'>
              {trip.title}
            </h1>
            <div className='mt-0.5 flex items-center gap-3 text-sm text-muted-foreground'>
              {trip.destination && (
                <span className='flex items-center gap-1'>
                  <MapPin size={13} /> {trip.destination}
                </span>
              )}
              <span>{dateRange}</span>
              <span className='font-medium text-primary'>{totalDays} 天</span>
            </div>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className='flex-1 overflow-x-auto px-4 py-6'>
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
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
            {activeAttractionId && getActiveAttraction() && (
              <div className='rotate-2 opacity-90 shadow-xl'>
                <AttractionCard
                  attraction={getActiveAttraction()!}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

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
