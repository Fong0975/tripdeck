import { Router } from 'express';

// Import each controller directly from its source file rather than the
// `controllers/checklist` barrel: swagger-autogen cannot trace a handler
// through an `export * from` re-export, so it would silently drop that
// endpoint's #swagger.* documentation.
import {
  addTripCategory,
  deleteTripCategory,
  updateTripCategory,
} from '../controllers/checklist/tripCategoryController';
import { getTripChecklist } from '../controllers/checklist/tripChecklistController';
import {
  addTripItem,
  deleteTripItem,
  setCheck,
  updateTripItem,
} from '../controllers/checklist/tripItemController';
import {
  addTripItemSpec,
  deleteTripItemSpec,
  updateTripItemSpec,
} from '../controllers/checklist/tripItemSpecController';
import {
  addOccasion,
  deleteOccasion,
  updateOccasion,
} from '../controllers/checklist/tripOccasionController';
import { validateIdParams } from '../middleware/validateIdParam';

// mergeParams: true allows access to :tripId from the parent trip router,
// which also validates it.
const router = Router({ mergeParams: true });

validateIdParams(router, ['occId', 'catId', 'itemId', 'specId']);

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
