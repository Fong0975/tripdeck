import { Router } from 'express';

import {
  addOccasion,
  addTripCategory,
  addTripItem,
  addTripItemSpec,
  deleteOccasion,
  deleteTripCategory,
  deleteTripItem,
  deleteTripItemSpec,
  getTripChecklist,
  setCheck,
  updateOccasion,
  updateTripCategory,
  updateTripItem,
  updateTripItemSpec,
} from '../controllers/checklistController';

// mergeParams: true allows access to :tripId from the parent trip router
const router = Router({ mergeParams: true });

router.get('/', getTripChecklist);
router.post('/occasions', addOccasion);
router.put('/occasions/:occId', updateOccasion);
router.delete('/occasions/:occId', deleteOccasion);
router.put('/occasions/:occId/items/:itemId/check', setCheck);
router.post('/categories', addTripCategory);
router.put('/categories/:catId', updateTripCategory);
router.delete('/categories/:catId', deleteTripCategory);
router.post('/categories/:catId/items', addTripItem);
router.put('/items/:itemId', updateTripItem);
router.delete('/items/:itemId', deleteTripItem);
router.post('/items/:itemId/specs', addTripItemSpec);
router.put('/items/:itemId/specs/:specId', updateTripItemSpec);
router.delete('/items/:itemId/specs/:specId', deleteTripItemSpec);

export default router;
