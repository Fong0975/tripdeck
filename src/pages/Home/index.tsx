import { useState } from 'react';

import AddTripModal from '@/components/AddTripModal';
import Navbar from '@/components/Navbar';

import ChecklistSection from './ChecklistSection';
import HeroSection from './HeroSection';
import TripList from './TripList';
import { useHomeData } from './useHomeData';

export default function Home() {
  const {
    trips,
    loading,
    refreshing,
    handleTripAdded,
    handleDeleteTrip,
    handleForceReload,
  } = useHomeData();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className='min-h-screen bg-background'>
      <Navbar />
      <HeroSection />
      <TripList
        trips={trips}
        loading={loading}
        refreshing={refreshing}
        onAdd={() => setShowModal(true)}
        onDelete={handleDeleteTrip}
        onReload={() => void handleForceReload()}
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
    </div>
  );
}
