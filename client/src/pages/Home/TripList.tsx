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
    <main className='mx-auto max-w-screen-xl px-4 pb-20'>
      <div className='mb-8 flex items-center justify-between'>
        <h2 className='text-foreground text-2xl font-bold'>我的旅程</h2>
        <div className='flex items-center gap-2'>
          <button
            onClick={onImportExport}
            className='border-border text-foreground hover:bg-accent flex items-center gap-2 rounded-xl border px-4 py-2 font-medium transition-colors'
          >
            <FolderInput size={18} />
            匯入 / 匯出
          </button>
          <button
            onClick={onAdd}
            className='bg-primary text-primary-foreground flex items-center gap-2 rounded-xl px-4 py-2 font-medium transition-all hover:opacity-90 active:scale-95'
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
          <p className='text-muted-foreground text-lg'>
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
