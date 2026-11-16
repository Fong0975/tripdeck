import { useState } from 'react';

import AddTripModal from '@/components/AddTripModal';
import TemplateModal from '@/components/Checklist/template/TemplateModal';
import EditTripModal from '@/components/EditTripModal';
import ImportExportModal from '@/components/ImportExportModal';
import Navbar from '@/components/Navbar';
import type { Trip } from '@/types';

import HeroSection from './HeroSection';
import TripList from './TripList';
import { useHomeData } from './useHomeData';

export default function Home() {
  const {
    trips,
    loading,
    loadError,
    handleTripAdded,
    handleDeleteTrip,
    handleTripUpdated,
    reloadTrips,
  } = useHomeData();
  const [showModal, setShowModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  return (
    <div className='min-h-screen bg-background'>
      <Navbar onImportExport={() => setShowImportExportModal(true)} />
      <HeroSection />
      <TripList
        trips={trips}
        loading={loading}
        loadError={loadError}
        onRetry={() => void reloadTrips()}
        onAdd={() => setShowModal(true)}
        onDelete={id => void handleDeleteTrip(id)}
        onEdit={setEditingTrip}
        onOpenTemplate={() => setShowTemplateModal(true)}
      />

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
          onImagesChanged={() => void reloadTrips()}
        />
      )}

      {showTemplateModal && (
        <TemplateModal onClose={() => setShowTemplateModal(false)} />
      )}

      {showImportExportModal && (
        <ImportExportModal
          trips={trips}
          onClose={() => setShowImportExportModal(false)}
          onImported={() => void reloadTrips()}
        />
      )}
    </div>
  );
}
