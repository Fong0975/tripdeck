import { Router } from 'express';

// Import each controller directly from its source file rather than the
// `controllers/checklist` barrel: swagger-autogen cannot trace a handler
// through an `export * from` re-export, so it would silently drop that
// endpoint's #swagger.* documentation.
import {
  addTemplateCategory,
  deleteTemplateCategory,
  getTemplate,
  updateTemplateCategory,
} from '../controllers/checklist/templateCategoryController';
import {
  addTemplateItem,
  deleteTemplateItem,
  updateTemplateItem,
} from '../controllers/checklist/templateItemController';
import {
  addTemplateItemSpec,
  deleteTemplateItemSpec,
  updateTemplateItemSpec,
} from '../controllers/checklist/templateItemSpecController';
import { validateIdParams } from '../middleware/validateIdParam';

const router = Router();

validateIdParams(router, ['catId', 'itemId', 'specId']);

router.get('/', getTemplate);
router.post('/categories', addTemplateCategory);
router.put('/categories/:catId', updateTemplateCategory);
router.delete('/categories/:catId', deleteTemplateCategory);
router.post('/categories/:catId/items', addTemplateItem);
router.put('/categories/:catId/items/:itemId', updateTemplateItem);
router.delete('/categories/:catId/items/:itemId', deleteTemplateItem);
router.post('/categories/:catId/items/:itemId/specs', addTemplateItemSpec);
router.put(
  '/categories/:catId/items/:itemId/specs/:specId',
  updateTemplateItemSpec,
);
router.delete(
  '/categories/:catId/items/:itemId/specs/:specId',
  deleteTemplateItemSpec,
);

export default router;
