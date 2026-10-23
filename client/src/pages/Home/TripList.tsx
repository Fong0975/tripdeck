import { FolderInput, Plus } from 'lucide-react';

import TripCard from '@/components/TripCard';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import type { Trip } from '@/types';

interface Props {
  trips: Trip[];
  loading: boolean;
  onAdd: () => void;
  onDelete: (id: number) => void;
  onEdit: (trip: Trip) => void;
  onImportExport: () => void;
}

export default function TripList({
  trips,
  loading,
  onAdd,
  onDelete,
  onEdit,
  onImportExport,
}: Props) {
  return (
    <main className='mx-auto max-w-7xl px-4 pb-20'>
      <div className='mb-8 flex items-center justify-between'>
        <h2 className='text-2xl font-bold text-foreground'>我的旅程</h2>
        <div className='flex items-center gap-2'>
          <button
            onClick={onImportExport}
            className='flex items-center gap-2 rounded-xl border border-border px-4 py-2 font-medium text-foreground transition-colors hover:bg-accent'
          >
            <FolderInput size={18} />
            匯入 / 匯出
          </button>
          <button
            onClick={onAdd}
            className='flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-95'
          >
            <Plus size={18} />
            新增旅程
          </button>
        </div>
      </div>

      {loading ? (
        <div className='py-24 text-center'>
          <LoadingIndicator />
        </div>
      ) : trips.length === 0 ? (
        <div className='py-24 text-center'>
          <p className='mb-4 text-5xl'>✈️</p>
          <p className='text-lg text-muted-foreground'>
            還沒有旅程，點擊「新增旅程」開始規劃吧！
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {trips.map(trip => (
            <TripCard
              key={trip.id}
              trip={trip}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </main>
  );
}
