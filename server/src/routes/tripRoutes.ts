import { Router } from 'express';

import * as imageController from '../controllers/imageController';
// Import each controller directly from its source file rather than the
// `controllers/trip` barrel: swagger-autogen cannot trace a handler through
// an `export * from` re-export, so it would silently drop that endpoint's
// #swagger.* documentation.
import * as attractionController from '../controllers/trip/attractionController';
import * as connectionController from '../controllers/trip/connectionController';
import * as dayLocationController from '../controllers/trip/dayLocationController';
import * as tripCrudController from '../controllers/trip/tripCrudController';
import { upload } from '../middleware/upload';

import checklistTripRoutes from './checklistTripRoutes';

const router = Router();

// Trip CRUD
router.get('/', tripCrudController.getTrips);
router.post('/', tripCrudController.createTrip);
router.get('/:tripId', tripCrudController.getTrip);
router.put('/:tripId', tripCrudController.updateTrip);
router.delete('/:tripId', tripCrudController.deleteTrip);

// Full trip content (days + attractions + connections)
router.get('/:tripId/content', tripCrudController.getTripContent);

// Attractions
router.post(
  '/:tripId/days/:dayId/attractions',
  attractionController.addAttraction,
);
router.put(
  '/:tripId/attractions/:attractionId',
  attractionController.updateAttraction,
);
router.delete(
  '/:tripId/attractions/:attractionId',
  attractionController.deleteAttraction,
);
router.post(
  '/:tripId/attractions/:attractionId/duplicate',
  attractionController.duplicateAttraction,
);
router.patch(
  '/:tripId/days/:dayId/attractions/order',
  attractionController.reorderAttractions,
);

// Day locations
router.post(
  '/:tripId/days/:dayId/locations',
  dayLocationController.addDayLocation,
);
router.put(
  '/:tripId/locations/:locationId',
  dayLocationController.updateDayLocation,
);
router.delete(
  '/:tripId/locations/:locationId',
  dayLocationController.deleteDayLocation,
);

// Connections
router.post(
  '/:tripId/days/:dayId/connections',
  connectionController.addConnection,
);
router.put(
  '/:tripId/connections/:connectionId',
  connectionController.updateConnection,
);
router.delete(
  '/:tripId/connections/:connectionId',
  connectionController.deleteConnection,
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

// Trip images
router.post(
  '/:tripId/images',
  upload.single('image'),
  imageController.uploadTripImage,
);
router.delete('/:tripId/images/:imageId', imageController.deleteTripImage);

// Checklist
router.use('/:tripId/checklist', checklistTripRoutes);

export default router;
