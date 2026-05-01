import { Router } from 'express';

import * as imageController from '../controllers/imageController';
import * as tripController from '../controllers/tripController';
import { upload } from '../middleware/upload';

import checklistTripRoutes from './checklistTripRoutes';

const router = Router();

// Trip CRUD
router.get('/', tripController.getTrips);
router.post('/', tripController.createTrip);
router.get('/:tripId', tripController.getTrip);
router.delete('/:tripId', tripController.deleteTrip);

// Full trip content (days + attractions + connections)
router.get('/:tripId/content', tripController.getTripContent);

// Attractions
router.post('/:tripId/days/:dayId/attractions', tripController.addAttraction);
router.put(
  '/:tripId/attractions/:attractionId',
  tripController.updateAttraction,
);
router.delete(
  '/:tripId/attractions/:attractionId',
  tripController.deleteAttraction,
);
router.post(
  '/:tripId/attractions/:attractionId/duplicate',
  tripController.duplicateAttraction,
);
router.patch(
  '/:tripId/days/:dayId/attractions/order',
  tripController.reorderAttractions,
);

// Day locations
router.post('/:tripId/days/:dayId/locations', tripController.addDayLocation);
router.put('/:tripId/locations/:locationId', tripController.updateDayLocation);
router.delete(
  '/:tripId/locations/:locationId',
  tripController.deleteDayLocation,
);

// Connections
router.post('/:tripId/days/:dayId/connections', tripController.addConnection);
router.put(
  '/:tripId/connections/:connectionId',
  tripController.updateConnection,
);
router.delete(
  '/:tripId/connections/:connectionId',
  tripController.deleteConnection,
);

// Attraction images
router.post(
  '/:tripId/attractions/:attractionId/images',
  upload.single('image'),
  imageController.uploadAttractionImage,
);
router.delete(
  '/:tripId/attractions/:attractionId/images/:imageId',
  imageController.deleteAttractionImage,
);

// Connection images
router.post(
  '/:tripId/connections/:connectionId/images',
  upload.single('image'),
  imageController.uploadConnectionImage,
);
router.delete(
  '/:tripId/connections/:connectionId/images/:imageId',
  imageController.deleteConnectionImage,
);

// Checklist
router.use('/:tripId/checklist', checklistTripRoutes);

export default router;
