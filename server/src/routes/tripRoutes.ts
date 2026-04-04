import { Router } from 'express';

import * as tripController from '../controllers/tripController';

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
router.patch(
  '/:tripId/days/:dayId/attractions/order',
  tripController.reorderAttractions,
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

export default router;
