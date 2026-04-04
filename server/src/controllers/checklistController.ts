import type { Request, Response } from 'express';

import * as templateRepo from '../repositories/checklistTemplateRepository';
import * as tripRepo from '../repositories/checklistTripRepository';

// ── Template ─────────────────────────────────────────────────────────────────

export async function getTemplate(_req: Request, res: Response): Promise<void> {
  try {
    res.json(await templateRepo.findTemplate());
  } catch {
    res.status(500).json({ error: 'Failed to fetch template' });
  }
}

export async function addCategory(req: Request, res: Response): Promise<void> {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    res.status(201).json(await templateRepo.createCategory(name));
  } catch {
    res.status(500).json({ error: 'Failed to add category' });
  }
}

export async function updateCategory(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const catId = Number(req.params.catId);
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const category = await templateRepo.updateCategory(catId, name);
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.json(category);
  } catch {
    res.status(500).json({ error: 'Failed to update category' });
  }
}

export async function deleteCategory(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const catId = Number(req.params.catId);
    const deleted = await templateRepo.deleteCategory(catId);
    if (!deleted) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete category' });
  }
}

export async function addItem(req: Request, res: Response): Promise<void> {
  try {
    const catId = Number(req.params.catId);
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const item = await templateRepo.createItem(catId, name);
    if (!item) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.status(201).json(item);
  } catch {
    res.status(500).json({ error: 'Failed to add item' });
  }
}

export async function updateItem(req: Request, res: Response): Promise<void> {
  try {
    const catId = Number(req.params.catId);
    const itemId = Number(req.params.itemId);
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const belongs = await templateRepo.verifyItemBelongsToCategory(
      itemId,
      catId,
    );
    if (!belongs) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const item = await templateRepo.updateItem(itemId, name);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Failed to update item' });
  }
}

export async function deleteItem(req: Request, res: Response): Promise<void> {
  try {
    const catId = Number(req.params.catId);
    const itemId = Number(req.params.itemId);
    const belongs = await templateRepo.verifyItemBelongsToCategory(
      itemId,
      catId,
    );
    if (!belongs) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const deleted = await templateRepo.deleteItem(itemId);
    if (!deleted) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete item' });
  }
}

// ── Trip checklist ────────────────────────────────────────────────────────────

export async function getTripChecklist(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const tripId = Number(req.params.tripId);
    res.json(await tripRepo.findOrInitChecklist(tripId));
  } catch {
    res.status(500).json({ error: 'Failed to fetch checklist' });
  }
}

export async function addOccasion(req: Request, res: Response): Promise<void> {
  try {
    const tripId = Number(req.params.tripId);
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    res.status(201).json(await tripRepo.createOccasion(tripId, name));
  } catch {
    res.status(500).json({ error: 'Failed to add occasion' });
  }
}

export async function updateOccasion(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const tripId = Number(req.params.tripId);
    const occId = Number(req.params.occId);
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const belongs = await tripRepo.verifyOccasionBelongsToTrip(occId, tripId);
    if (!belongs) {
      res.status(404).json({ error: 'Occasion not found' });
      return;
    }
    const occasion = await tripRepo.updateOccasion(occId, name);
    if (!occasion) {
      res.status(404).json({ error: 'Occasion not found' });
      return;
    }
    res.json(occasion);
  } catch {
    res.status(500).json({ error: 'Failed to update occasion' });
  }
}

export async function deleteOccasion(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const tripId = Number(req.params.tripId);
    const occId = Number(req.params.occId);
    const belongs = await tripRepo.verifyOccasionBelongsToTrip(occId, tripId);
    if (!belongs) {
      res.status(404).json({ error: 'Occasion not found' });
      return;
    }
    const count = await tripRepo.getOccasionCount(tripId);
    if (count <= 1) {
      res.status(409).json({ error: 'Cannot delete the last occasion' });
      return;
    }
    const deleted = await tripRepo.deleteOccasion(occId);
    if (!deleted) {
      res.status(404).json({ error: 'Occasion not found' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete occasion' });
  }
}

export async function setCheck(req: Request, res: Response): Promise<void> {
  try {
    const tripId = Number(req.params.tripId);
    const occId = Number(req.params.occId);
    const itemId = Number(req.params.itemId);
    const { checked } = req.body;
    if (typeof checked !== 'boolean') {
      res.status(400).json({ error: 'checked must be a boolean' });
      return;
    }
    const occBelongs = await tripRepo.verifyOccasionBelongsToTrip(
      occId,
      tripId,
    );
    if (!occBelongs) {
      res.status(404).json({ error: 'Occasion not found' });
      return;
    }
    const itemBelongs = await tripRepo.verifyItemBelongsToTrip(itemId, tripId);
    if (!itemBelongs) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    await tripRepo.setCheck(occId, itemId, checked);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to set check' });
  }
}
