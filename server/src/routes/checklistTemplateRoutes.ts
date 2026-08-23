import { Router } from 'express';

// Import each controller directly from its source file rather than the
// `controllers/checklist` barrel: swagger-autogen cannot trace a handler
// through an `export * from` re-export, so it would silently drop that
// endpoint's #swagger.* documentation.
import {
  addCategory,
  deleteCategory,
  getTemplate,
  updateCategory,
} from '../controllers/checklist/templateCategoryController';
import {
  addItem,
  deleteItem,
  updateItem,
} from '../controllers/checklist/templateItemController';
import {
  addTemplateItemSpec,
  deleteTemplateItemSpec,
  updateTemplateItemSpec,
} from '../controllers/checklist/templateItemSpecController';

const router = Router();

router.get('/', getTemplate);
router.post('/categories', addCategory);
router.put('/categories/:catId', updateCategory);
router.delete('/categories/:catId', deleteCategory);
router.post('/categories/:catId/items', addItem);
router.put('/categories/:catId/items/:itemId', updateItem);
router.delete('/categories/:catId/items/:itemId', deleteItem);
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
