import { Router } from 'express';

import {
  addCategory,
  addItem,
  deleteCategory,
  deleteItem,
  getTemplate,
  updateCategory,
  updateItem,
} from '../controllers/checklistController';

const router = Router();

router.get('/', getTemplate);
router.post('/categories', addCategory);
router.put('/categories/:catId', updateCategory);
router.delete('/categories/:catId', deleteCategory);
router.post('/categories/:catId/items', addItem);
router.put('/categories/:catId/items/:itemId', updateItem);
router.delete('/categories/:catId/items/:itemId', deleteItem);

export default router;
