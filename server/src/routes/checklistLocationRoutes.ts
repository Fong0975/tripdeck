import { Router } from 'express';

// Import each controller directly from its source file: swagger-autogen
// cannot trace a handler through an `export * from` re-export.
import {
  addLocationLabel,
  deleteLocationLabel,
  getLocationLabels,
  reorderLocationLabels,
  updateLocationLabel,
} from '../controllers/checklist/locationLabelController';
import { validateIdParams } from '../middleware/validateIdParam';

const router = Router();

validateIdParams(router, ['labelId']);

router.get('/', getLocationLabels);
router.post('/', addLocationLabel);
router.patch('/order', reorderLocationLabels);
router.put('/:labelId', updateLocationLabel);
router.delete('/:labelId', deleteLocationLabel);

export default router;
