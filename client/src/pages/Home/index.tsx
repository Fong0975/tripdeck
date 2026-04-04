import { useState } from 'react';

import AddTripModal from '@/components/AddTripModal';
import Navbar from '@/components/Navbar';

import ChecklistSection from './ChecklistSection';
import HeroSection from './HeroSection';
import TripList from './TripList';
import { useHomeData } from './useHomeData';

export default function Home() {
  const { trips, loading, handleTripAdded, handleDeleteTrip } = useHomeData();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className='bg-background min-h-screen'>
      <Navbar />
      <HeroSection />
      <TripList
        trips={trips}
        loading={loading}
        onAdd={() => setShowModal(true)}
        onDelete={id => void handleDeleteTrip(id)}
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
