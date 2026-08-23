import { useState } from 'react';

import AddTripModal from '@/components/AddTripModal';
import EditTripModal from '@/components/EditTripModal';
import Navbar from '@/components/Navbar';
import type { Trip } from '@/types';

import ChecklistSection from './ChecklistSection';
import HeroSection from './HeroSection';
import TripList from './TripList';
import { useHomeData } from './useHomeData';

export default function Home() {
  const {
    trips,
    loading,
    handleTripAdded,
    handleDeleteTrip,
    handleTripUpdated,
  } = useHomeData();
  const [showModal, setShowModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  return (
    <div className='bg-background min-h-screen'>
      <Navbar />
      <HeroSection />
      <TripList
        trips={trips}
        loading={loading}
        onAdd={() => setShowModal(true)}
        onDelete={id => void handleDeleteTrip(id)}
        onEdit={setEditingTrip}
      />

      <ChecklistSection />

      {showModal && (
        <AddTripModal
          onClose={() => setShowModal(false)}
          onAdded={trip => {
            handleTripAdded(trip);
            setShowModal(false);
          }}
        />
      )}

      {editingTrip && (
        <EditTripModal
          trip={editingTrip}
          onClose={() => setEditingTrip(null)}
          onUpdated={trip => {
            handleTripUpdated(trip);
            setEditingTrip(null);
          }}
        />
      )}
    </div>
  );
}
