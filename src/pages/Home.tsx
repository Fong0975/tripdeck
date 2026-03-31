import { Plus } from 'lucide-react';
import { useState, useEffect } from 'react';

import AddTripModal from '@/components/AddTripModal';
import Navbar from '@/components/Navbar';
import TripCard from '@/components/TripCard';
import type { Trip } from '@/types';
import { getTrips, deleteTrip } from '@/utils/storage';

export default function Home() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setTrips(getTrips());
  }, []);

  const handleTripAdded = (trip: Trip) => {
    setTrips(prev => [...prev, trip]);
    setShowModal(false);
  };

  const handleDeleteTrip = (id: string) => {
    deleteTrip(id);
    setTrips(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className='min-h-screen bg-background'>
      <Navbar />

      {/* Hero Section */}
      <section className='relative overflow-hidden px-4 py-20'>
        {/* Background grid pattern */}
        <div
          className='pointer-events-none absolute inset-0 opacity-30 dark:opacity-20'
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className='relative mx-auto max-w-screen-xl text-center'>
          <h1 className='shimmer-text mb-4 text-5xl font-extrabold'>
            規劃你的旅程
          </h1>
          <p className='mx-auto max-w-md text-lg text-muted-foreground'>
            像卡牌一樣排列景點，輕鬆安排每一天的行程
          </p>
        </div>
      </section>

      {/* Trip List */}
      <main className='mx-auto max-w-screen-xl px-4 pb-20'>
        <div className='mb-8 flex items-center justify-between'>
          <h2 className='text-2xl font-bold text-foreground'>我的旅程</h2>
          <button
            onClick={() => setShowModal(true)}
            className='flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-95'
          >
            <Plus size={18} />
            新增旅程
          </button>
        </div>

        {trips.length === 0 ? (
          <div className='py-24 text-center'>
            <p className='mb-4 text-5xl'>✈️</p>
            <p className='text-lg text-muted-foreground'>
              還沒有旅程，點擊「新增旅程」開始規劃吧！
            </p>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
            {trips.map(trip => (
              <TripCard key={trip.id} trip={trip} onDelete={handleDeleteTrip} />
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <AddTripModal
          onClose={() => setShowModal(false)}
          onAdded={handleTripAdded}
        />
      )}
    </div>
  );
}
