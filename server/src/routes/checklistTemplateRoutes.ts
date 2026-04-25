import { Router } from 'express';

import {
  addCategory,
  addItem,
  addTemplateItemSpec,
  deleteCategory,
  deleteItem,
  deleteTemplateItemSpec,
  getTemplate,
  updateCategory,
  updateItem,
  updateTemplateItemSpec,
} from '../controllers/checklistController';

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
