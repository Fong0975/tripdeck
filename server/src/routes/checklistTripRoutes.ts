import { Router } from 'express';

import {
  addOccasion,
  deleteOccasion,
  getTripChecklist,
  setCheck,
  updateOccasion,
} from '../controllers/checklistController';

// mergeParams: true allows access to :tripId from the parent trip router
const router = Router({ mergeParams: true });

router.get('/', getTripChecklist);
router.post('/occasions', addOccasion);
router.put('/occasions/:occId', updateOccasion);
router.delete('/occasions/:occId', deleteOccasion);
router.put('/occasions/:occId/items/:itemId/check', setCheck);

export default router;
