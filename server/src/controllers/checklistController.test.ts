import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as templateRepo from '../repositories/checklist/template';
import * as tripRepo from '../repositories/checklist/trip';
import { createMockReqRes, expectJsonStatus } from '../test-utils/httpMocks';

import {
  addCategory,
  addItem,
  addOccasion,
  addTemplateItemSpec,
  addTripCategory,
  addTripItem,
  addTripItemSpec,
  deleteCategory,
  deleteItem,
  deleteOccasion,
  deleteTemplateItemSpec,
  deleteTripCategory,
  deleteTripItem,
  deleteTripItemSpec,
  getTemplate,
  getTripChecklist,
  setCheck,
  updateCategory,
  updateItem,
  updateOccasion,
  updateTemplateItemSpec,
  updateTripCategory,
  updateTripItem,
  updateTripItemSpec,
} from './checklistController';

vi.mock('../repositories/checklist/template');
vi.mock('../repositories/checklist/trip');

const invalidNameCases = [
  { label: 'name is missing', body: {} },
  { label: 'name is an empty string', body: { name: '' } },
  { label: 'name is not a string', body: { name: 42 } },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checklistController', () => {
  // ── Template ─────────────────────────────────────────────────────────────

  describe('getTemplate', () => {
    it('returns 200 with the template', async () => {
      const template = { categories: [] };
      vi.mocked(templateRepo.findTemplate).mockResolvedValue(template);
      const { req, res } = createMockReqRes();

      await getTemplate(req, res);

      expect(res.json).toHaveBeenCalledWith(template);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('addCategory', () => {
    it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
      const { req, res } = createMockReqRes({ body });

      await addCategory(req, res);

      expectJsonStatus(res, 400, { error: 'name is required' });
      expect(templateRepo.createCategory).not.toHaveBeenCalled();
    });

    it('returns 201 with the created category', async () => {
      const category = { id: 7, name: 'Sports Gear', items: [] };
      vi.mocked(templateRepo.createCategory).mockResolvedValue(category);
      const { req, res } = createMockReqRes({ body: { name: 'Sports Gear' } });

      await addCategory(req, res);

      expect(templateRepo.createCategory).toHaveBeenCalledWith('Sports Gear');
      expectJsonStatus(res, 201, category);
    });
  });

  describe('updateCategory', () => {
    it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
      const { req, res } = createMockReqRes({ params: { catId: '1' }, body });

      await updateCategory(req, res);

      expectJsonStatus(res, 400, { error: 'name is required' });
      expect(templateRepo.updateCategory).not.toHaveBeenCalled();
    });

    it('returns 404 when the category does not exist', async () => {
      vi.mocked(templateRepo.updateCategory).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { catId: '1' },
        body: { name: 'Documents' },
      });

      await updateCategory(req, res);

      expectJsonStatus(res, 404, { error: 'Category not found' });
    });

    it('returns 200 with the updated category', async () => {
      const category = { id: 1, name: 'Documents', items: [] };
      vi.mocked(templateRepo.updateCategory).mockResolvedValue(category);
      const { req, res } = createMockReqRes({
        params: { catId: '1' },
        body: { name: 'Documents' },
      });

      await updateCategory(req, res);

      expect(templateRepo.updateCategory).toHaveBeenCalledWith(1, 'Documents');
      expect(res.json).toHaveBeenCalledWith(category);
    });
  });

  describe('deleteCategory', () => {
    it('returns 404 when the category does not exist', async () => {
      vi.mocked(templateRepo.deleteCategory).mockResolvedValue(false);
      const { req, res } = createMockReqRes({ params: { catId: '1' } });

      await deleteCategory(req, res);

      expectJsonStatus(res, 404, { error: 'Category not found' });
    });

    it('returns 204 on success', async () => {
      vi.mocked(templateRepo.deleteCategory).mockResolvedValue(true);
      const { req, res } = createMockReqRes({ params: { catId: '1' } });

      await deleteCategory(req, res);

      expect(templateRepo.deleteCategory).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe('addItem', () => {
    it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
      const { req, res } = createMockReqRes({ params: { catId: '1' }, body });

      await addItem(req, res);

      expectJsonStatus(res, 400, { error: 'name is required' });
      expect(templateRepo.createItem).not.toHaveBeenCalled();
    });

    it('returns 404 when the category does not exist', async () => {
      vi.mocked(templateRepo.createItem).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { catId: '1' },
        body: { name: 'e-Visa' },
      });

      await addItem(req, res);

      expectJsonStatus(res, 404, { error: 'Category not found' });
    });

    it('returns 201 with the created item', async () => {
      const item = {
        id: 32,
        name: 'e-Visa',
        quantity: null,
        notes: null,
        storage_location: null,
        specs: [],
      };
      vi.mocked(templateRepo.createItem).mockResolvedValue(item);
      const { req, res } = createMockReqRes({
        params: { catId: '1' },
        body: { name: 'e-Visa' },
      });

      await addItem(req, res);

      expect(templateRepo.createItem).toHaveBeenCalledWith(1, {
        name: 'e-Visa',
        quantity: undefined,
        notes: undefined,
        storage_location: undefined,
      });
      expectJsonStatus(res, 201, item);
    });
  });

  describe('updateItem', () => {
    it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2' },
        body,
      });

      await updateItem(req, res);

      expectJsonStatus(res, 400, { error: 'name is required' });
      expect(templateRepo.verifyItemBelongsToCategory).not.toHaveBeenCalled();
    });

    it('returns 404 when the item does not belong to the category', async () => {
      vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
        false,
      );
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2' },
        body: { name: 'Charger' },
      });

      await updateItem(req, res);

      expectJsonStatus(res, 404, { error: 'Item not found' });
      expect(templateRepo.updateItem).not.toHaveBeenCalled();
    });

    it('returns 404 when the update resolves null', async () => {
      vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
        true,
      );
      vi.mocked(templateRepo.updateItem).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2' },
        body: { name: 'Charger' },
      });

      await updateItem(req, res);

      expectJsonStatus(res, 404, { error: 'Item not found' });
    });

    it('returns 200 with the updated item', async () => {
      const item = {
        id: 2,
        name: 'Charger',
        quantity: 2,
        notes: null,
        storage_location: null,
        specs: [],
      };
      vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
        true,
      );
      vi.mocked(templateRepo.updateItem).mockResolvedValue(item);
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2' },
        body: { name: 'Charger' },
      });

      await updateItem(req, res);

      expect(res.json).toHaveBeenCalledWith(item);
    });
  });

  describe('deleteItem', () => {
    it('returns 404 when the item does not belong to the category', async () => {
      vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
        false,
      );
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2' },
      });

      await deleteItem(req, res);

      expectJsonStatus(res, 404, { error: 'Item not found' });
      expect(templateRepo.deleteItem).not.toHaveBeenCalled();
    });

    it('returns 404 when the delete resolves false', async () => {
      vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
        true,
      );
      vi.mocked(templateRepo.deleteItem).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2' },
      });

      await deleteItem(req, res);

      expectJsonStatus(res, 404, { error: 'Item not found' });
    });

    it('returns 204 on success', async () => {
      vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
        true,
      );
      vi.mocked(templateRepo.deleteItem).mockResolvedValue(true);
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2' },
      });

      await deleteItem(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  // ── Trip checklist ───────────────────────────────────────────────────────

  describe('getTripChecklist', () => {
    it('returns 200 with the trip checklist', async () => {
      const checklist = { tripId: 5, categories: [], occasions: [] };
      vi.mocked(tripRepo.findOrInitChecklist).mockResolvedValue(checklist);
      const { req, res } = createMockReqRes({ params: { tripId: '5' } });

      await getTripChecklist(req, res);

      expect(tripRepo.findOrInitChecklist).toHaveBeenCalledWith(5);
      expect(res.json).toHaveBeenCalledWith(checklist);
    });
  });

  describe('addOccasion', () => {
    it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
      const { req, res } = createMockReqRes({ params: { tripId: '1' }, body });

      await addOccasion(req, res);

      expectJsonStatus(res, 400, { error: 'name is required' });
      expect(tripRepo.createOccasion).not.toHaveBeenCalled();
    });

    it('returns 201 with the created occasion', async () => {
      const occasion = { id: 2, name: 'Return trip', checks: {} };
      vi.mocked(tripRepo.createOccasion).mockResolvedValue(occasion);
      const { req, res } = createMockReqRes({
        params: { tripId: '1' },
        body: { name: 'Return trip' },
      });

      await addOccasion(req, res);

      expect(tripRepo.createOccasion).toHaveBeenCalledWith(1, 'Return trip');
      expectJsonStatus(res, 201, occasion);
    });
  });

  describe('updateOccasion', () => {
    it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
      const { req, res } = createMockReqRes({
        params: { tripId: '1', occId: '2' },
        body,
      });

      await updateOccasion(req, res);

      expectJsonStatus(res, 400, { error: 'name is required' });
      expect(tripRepo.verifyOccasionBelongsToTrip).not.toHaveBeenCalled();
    });

    it('returns 404 when the occasion does not belong to the trip', async () => {
      vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', occId: '2' },
        body: { name: 'Departure' },
      });

      await updateOccasion(req, res);

      expectJsonStatus(res, 404, { error: 'Occasion not found' });
      expect(tripRepo.updateOccasion).not.toHaveBeenCalled();
    });

    it('returns 404 when the update resolves null', async () => {
      vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.updateOccasion).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', occId: '2' },
        body: { name: 'Departure' },
      });

      await updateOccasion(req, res);

      expectJsonStatus(res, 404, { error: 'Occasion not found' });
    });

    it('returns 200 with the updated occasion', async () => {
      const occasion = { id: 2, name: 'Departure', checks: {} };
      vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.updateOccasion).mockResolvedValue(occasion);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', occId: '2' },
        body: { name: 'Departure' },
      });

      await updateOccasion(req, res);

      expect(res.json).toHaveBeenCalledWith(occasion);
    });
  });

  describe('deleteOccasion', () => {
    it('returns 404 when the occasion does not belong to the trip', async () => {
      vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', occId: '2' },
      });

      await deleteOccasion(req, res);

      expectJsonStatus(res, 404, { error: 'Occasion not found' });
      expect(tripRepo.getOccasionCount).not.toHaveBeenCalled();
    });

    it.each([
      {
        count: 1,
        expectStatus: 409,
        expectError: 'Cannot delete the last occasion',
      },
      {
        count: 0,
        expectStatus: 409,
        expectError: 'Cannot delete the last occasion',
      },
    ])(
      'returns 409 when the occasion count is $count',
      async ({ count, expectStatus, expectError }) => {
        vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(true);
        vi.mocked(tripRepo.getOccasionCount).mockResolvedValue(count);
        const { req, res } = createMockReqRes({
          params: { tripId: '1', occId: '2' },
        });

        await deleteOccasion(req, res);

        expectJsonStatus(res, expectStatus, { error: expectError });
        expect(tripRepo.deleteOccasion).not.toHaveBeenCalled();
      },
    );

    it('proceeds to delete when the occasion count is greater than 1', async () => {
      vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.getOccasionCount).mockResolvedValue(2);
      vi.mocked(tripRepo.deleteOccasion).mockResolvedValue(true);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', occId: '2' },
      });

      await deleteOccasion(req, res);

      expect(tripRepo.deleteOccasion).toHaveBeenCalledWith(2);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('returns 404 when the count allows deletion but the delete resolves false', async () => {
      vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.getOccasionCount).mockResolvedValue(2);
      vi.mocked(tripRepo.deleteOccasion).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', occId: '2' },
      });

      await deleteOccasion(req, res);

      expectJsonStatus(res, 404, { error: 'Occasion not found' });
    });
  });

  describe('addTripCategory', () => {
    it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
      const { req, res } = createMockReqRes({ params: { tripId: '1' }, body });

      await addTripCategory(req, res);

      expectJsonStatus(res, 400, { error: 'name is required' });
      expect(tripRepo.createTripCategory).not.toHaveBeenCalled();
    });

    it('returns 201 with the created category', async () => {
      const category = { id: 3, name: 'Gear', items: [] };
      vi.mocked(tripRepo.createTripCategory).mockResolvedValue(category);
      const { req, res } = createMockReqRes({
        params: { tripId: '1' },
        body: { name: 'Gear' },
      });

      await addTripCategory(req, res);

      expect(tripRepo.createTripCategory).toHaveBeenCalledWith(1, 'Gear');
      expectJsonStatus(res, 201, category);
    });
  });

  describe('updateTripCategory', () => {
    it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
      const { req, res } = createMockReqRes({
        params: { tripId: '1', catId: '2' },
        body,
      });

      await updateTripCategory(req, res);

      expectJsonStatus(res, 400, { error: 'name is required' });
      expect(tripRepo.verifyCategoryBelongsToTrip).not.toHaveBeenCalled();
    });

    it('returns 404 when the category does not belong to the trip', async () => {
      vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', catId: '2' },
        body: { name: 'Gear' },
      });

      await updateTripCategory(req, res);

      expectJsonStatus(res, 404, { error: 'Category not found' });
      expect(tripRepo.updateTripCategory).not.toHaveBeenCalled();
    });

    it('returns 404 when the update resolves false', async () => {
      vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.updateTripCategory).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', catId: '2' },
        body: { name: 'Gear' },
      });

      await updateTripCategory(req, res);

      expectJsonStatus(res, 404, { error: 'Category not found' });
    });

    it('returns 204 with no body on success', async () => {
      vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.updateTripCategory).mockResolvedValue(true);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', catId: '2' },
        body: { name: 'Gear' },
      });

      await updateTripCategory(req, res);

      expect(tripRepo.updateTripCategory).toHaveBeenCalledWith(2, 'Gear');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('deleteTripCategory', () => {
    it('returns 404 when the category does not belong to the trip', async () => {
      vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', catId: '2' },
      });

      await deleteTripCategory(req, res);

      expectJsonStatus(res, 404, { error: 'Category not found' });
      expect(tripRepo.deleteTripCategory).not.toHaveBeenCalled();
    });

    it('returns 404 when the delete resolves false', async () => {
      vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.deleteTripCategory).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', catId: '2' },
      });

      await deleteTripCategory(req, res);

      expectJsonStatus(res, 404, { error: 'Category not found' });
    });

    it('returns 204 on success', async () => {
      vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.deleteTripCategory).mockResolvedValue(true);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', catId: '2' },
      });

      await deleteTripCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe('addTripItem', () => {
    it('returns 404 when the category does not belong to the trip, checked before name validation', async () => {
      vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', catId: '2' },
        body: {},
      });

      await addTripItem(req, res);

      expectJsonStatus(res, 404, { error: 'Category not found' });
      expect(tripRepo.createTripItem).not.toHaveBeenCalled();
    });

    it.each(invalidNameCases)(
      'returns 400 when $label once the category belongs to the trip',
      async ({ body }) => {
        vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(true);
        const { req, res } = createMockReqRes({
          params: { tripId: '1', catId: '2' },
          body,
        });

        await addTripItem(req, res);

        expectJsonStatus(res, 400, { error: 'name is required' });
        expect(tripRepo.createTripItem).not.toHaveBeenCalled();
      },
    );

    it('returns 201 with the created item', async () => {
      const item = {
        id: 63,
        name: 'Neck pillow',
        quantity: 1,
        notes: null,
        storage_location: null,
        specs: [],
      };
      vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.createTripItem).mockResolvedValue(item);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', catId: '2' },
        body: { name: 'Neck pillow' },
      });

      await addTripItem(req, res);

      expect(tripRepo.createTripItem).toHaveBeenCalledWith(2, {
        name: 'Neck pillow',
        quantity: undefined,
        notes: undefined,
        storage_location: undefined,
      });
      expectJsonStatus(res, 201, item);
    });
  });

  describe('deleteTripItem', () => {
    it('returns 404 when the item does not belong to the trip', async () => {
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2' },
      });

      await deleteTripItem(req, res);

      expectJsonStatus(res, 404, { error: 'Item not found' });
      expect(tripRepo.deleteTripItem).not.toHaveBeenCalled();
    });

    it('returns 404 when the delete resolves false', async () => {
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.deleteTripItem).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2' },
      });

      await deleteTripItem(req, res);

      expectJsonStatus(res, 404, { error: 'Item not found' });
    });

    it('returns 204 on success', async () => {
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.deleteTripItem).mockResolvedValue(true);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2' },
      });

      await deleteTripItem(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe('updateTripItem', () => {
    it('returns 404 when the item does not belong to the trip', async () => {
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2' },
        body: { name: 'Charger' },
      });

      await updateTripItem(req, res);

      expectJsonStatus(res, 404, { error: 'Item not found' });
      expect(tripRepo.updateTripItem).not.toHaveBeenCalled();
    });

    it('returns 404 when the update resolves null', async () => {
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.updateTripItem).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2' },
        body: { name: 'Charger' },
      });

      await updateTripItem(req, res);

      expectJsonStatus(res, 404, { error: 'Item not found' });
    });

    it('does not perform a name-required 400 check and updates with an empty body', async () => {
      const item = {
        id: 2,
        name: 'Charger',
        quantity: 2,
        notes: null,
        storage_location: null,
        specs: [],
      };
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.updateTripItem).mockResolvedValue(item);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2' },
        body: {},
      });

      await updateTripItem(req, res);

      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(tripRepo.updateTripItem).toHaveBeenCalledWith(2, {});
      expect(res.json).toHaveBeenCalledWith(item);
    });

    it('returns 200 with the updated item', async () => {
      const item = {
        id: 2,
        name: 'Charger',
        quantity: 2,
        notes: null,
        storage_location: null,
        specs: [],
      };
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.updateTripItem).mockResolvedValue(item);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2' },
        body: { name: 'Charger', quantity: 2 },
      });

      await updateTripItem(req, res);

      expect(res.json).toHaveBeenCalledWith(item);
    });
  });

  describe('setCheck', () => {
    it.each([
      { label: 'checked is missing', body: {} },
      { label: 'checked is a string', body: { checked: 'true' } },
      { label: 'checked is a number', body: { checked: 1 } },
    ])('returns 400 when $label', async ({ body }) => {
      const { req, res } = createMockReqRes({
        params: { tripId: '1', occId: '2', itemId: '3' },
        body,
      });

      await setCheck(req, res);

      expectJsonStatus(res, 400, { error: 'checked must be a boolean' });
      expect(tripRepo.verifyOccasionBelongsToTrip).not.toHaveBeenCalled();
    });

    it('returns 404 when the occasion does not belong to the trip', async () => {
      vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', occId: '2', itemId: '3' },
        body: { checked: true },
      });

      await setCheck(req, res);

      expectJsonStatus(res, 404, { error: 'Occasion not found' });
      expect(tripRepo.verifyItemBelongsToTrip).not.toHaveBeenCalled();
    });

    it('returns 404 when the item does not belong to the trip', async () => {
      vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', occId: '2', itemId: '3' },
        body: { checked: true },
      });

      await setCheck(req, res);

      expectJsonStatus(res, 404, { error: 'Item not found' });
      expect(tripRepo.setCheck).not.toHaveBeenCalled();
    });

    it('returns 204 on success', async () => {
      vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', occId: '2', itemId: '3' },
        body: { checked: true },
      });

      await setCheck(req, res);

      expect(tripRepo.setCheck).toHaveBeenCalledWith(2, 3, true);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  // ── Template item specs ──────────────────────────────────────────────────

  describe('addTemplateItemSpec', () => {
    it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2' },
        body,
      });

      await addTemplateItemSpec(req, res);

      expectJsonStatus(res, 400, { error: 'name is required' });
      expect(templateRepo.verifyItemBelongsToCategory).not.toHaveBeenCalled();
    });

    it('returns 404 when the item does not belong to the category', async () => {
      vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
        false,
      );
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2' },
        body: { name: 'Type-C charger' },
      });

      await addTemplateItemSpec(req, res);

      expectJsonStatus(res, 404, { error: 'Item not found' });
      expect(templateRepo.createItemSpec).not.toHaveBeenCalled();
    });

    it('returns 404 when the created spec resolves null', async () => {
      vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
        true,
      );
      vi.mocked(templateRepo.createItemSpec).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2' },
        body: { name: 'Type-C charger' },
      });

      await addTemplateItemSpec(req, res);

      expectJsonStatus(res, 404, { error: 'Item not found' });
    });

    it('returns 201 with the created spec', async () => {
      const spec = { id: 1, name: 'Type-C charger', storage_location: null };
      vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
        true,
      );
      vi.mocked(templateRepo.createItemSpec).mockResolvedValue(spec);
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2' },
        body: { name: 'Type-C charger' },
      });

      await addTemplateItemSpec(req, res);

      expect(templateRepo.createItemSpec).toHaveBeenCalledWith(2, {
        name: 'Type-C charger',
        storage_location: undefined,
      });
      expectJsonStatus(res, 201, spec);
    });
  });

  describe('updateTemplateItemSpec', () => {
    it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2', specId: '3' },
        body,
      });

      await updateTemplateItemSpec(req, res);

      expectJsonStatus(res, 400, { error: 'name is required' });
      expect(templateRepo.verifyItemBelongsToCategory).not.toHaveBeenCalled();
    });

    it('returns 404 when the item does not belong to the category', async () => {
      vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
        false,
      );
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2', specId: '3' },
        body: { name: 'Type-C charger' },
      });

      await updateTemplateItemSpec(req, res);

      expectJsonStatus(res, 404, { error: 'Item not found' });
      expect(templateRepo.verifySpecBelongsToItem).not.toHaveBeenCalled();
    });

    it('returns 404 when the spec does not belong to the item', async () => {
      vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
        true,
      );
      vi.mocked(templateRepo.verifySpecBelongsToItem).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2', specId: '3' },
        body: { name: 'Type-C charger' },
      });

      await updateTemplateItemSpec(req, res);

      expectJsonStatus(res, 404, { error: 'Spec not found' });
      expect(templateRepo.updateItemSpec).not.toHaveBeenCalled();
    });

    it('returns 404 when the update resolves null', async () => {
      vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
        true,
      );
      vi.mocked(templateRepo.verifySpecBelongsToItem).mockResolvedValue(true);
      vi.mocked(templateRepo.updateItemSpec).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2', specId: '3' },
        body: { name: 'Type-C charger' },
      });

      await updateTemplateItemSpec(req, res);

      expectJsonStatus(res, 404, { error: 'Spec not found' });
    });

    it('returns 200 with the updated spec', async () => {
      const spec = { id: 3, name: 'Type-C charger', storage_location: null };
      vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
        true,
      );
      vi.mocked(templateRepo.verifySpecBelongsToItem).mockResolvedValue(true);
      vi.mocked(templateRepo.updateItemSpec).mockResolvedValue(spec);
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2', specId: '3' },
        body: { name: 'Type-C charger' },
      });

      await updateTemplateItemSpec(req, res);

      expect(res.json).toHaveBeenCalledWith(spec);
    });
  });

  describe('deleteTemplateItemSpec', () => {
    it('returns 404 when the item does not belong to the category', async () => {
      vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
        false,
      );
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2', specId: '3' },
      });

      await deleteTemplateItemSpec(req, res);

      expectJsonStatus(res, 404, { error: 'Item not found' });
      expect(templateRepo.verifySpecBelongsToItem).not.toHaveBeenCalled();
    });

    it('returns 404 when the spec does not belong to the item', async () => {
      vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
        true,
      );
      vi.mocked(templateRepo.verifySpecBelongsToItem).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2', specId: '3' },
      });

      await deleteTemplateItemSpec(req, res);

      expectJsonStatus(res, 404, { error: 'Spec not found' });
      expect(templateRepo.deleteItemSpec).not.toHaveBeenCalled();
    });

    it('returns 404 when the delete resolves false', async () => {
      vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
        true,
      );
      vi.mocked(templateRepo.verifySpecBelongsToItem).mockResolvedValue(true);
      vi.mocked(templateRepo.deleteItemSpec).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2', specId: '3' },
      });

      await deleteTemplateItemSpec(req, res);

      expectJsonStatus(res, 404, { error: 'Spec not found' });
    });

    it('returns 204 on success', async () => {
      vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
        true,
      );
      vi.mocked(templateRepo.verifySpecBelongsToItem).mockResolvedValue(true);
      vi.mocked(templateRepo.deleteItemSpec).mockResolvedValue(true);
      const { req, res } = createMockReqRes({
        params: { catId: '1', itemId: '2', specId: '3' },
      });

      await deleteTemplateItemSpec(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  // ── Trip item specs ──────────────────────────────────────────────────────

  describe('addTripItemSpec', () => {
    it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2' },
        body,
      });

      await addTripItemSpec(req, res);

      expectJsonStatus(res, 400, { error: 'name is required' });
      expect(tripRepo.verifyItemBelongsToTrip).not.toHaveBeenCalled();
    });

    it('returns 404 when the item does not belong to the trip', async () => {
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2' },
        body: { name: 'Type-C charger' },
      });

      await addTripItemSpec(req, res);

      expectJsonStatus(res, 404, { error: 'Item not found' });
      expect(tripRepo.createTripItemSpec).not.toHaveBeenCalled();
    });

    it('returns 404 when the created spec resolves null', async () => {
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.createTripItemSpec).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2' },
        body: { name: 'Type-C charger' },
      });

      await addTripItemSpec(req, res);

      expectJsonStatus(res, 404, { error: 'Item not found' });
    });

    it('returns 201 with the created spec', async () => {
      const spec = { id: 1, name: 'Type-C charger', storage_location: null };
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.createTripItemSpec).mockResolvedValue(spec);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2' },
        body: { name: 'Type-C charger' },
      });

      await addTripItemSpec(req, res);

      expect(tripRepo.createTripItemSpec).toHaveBeenCalledWith(2, {
        name: 'Type-C charger',
        storage_location: undefined,
      });
      expectJsonStatus(res, 201, spec);
    });
  });

  describe('updateTripItemSpec', () => {
    it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2', specId: '3' },
        body,
      });

      await updateTripItemSpec(req, res);

      expectJsonStatus(res, 400, { error: 'name is required' });
      expect(tripRepo.verifyItemBelongsToTrip).not.toHaveBeenCalled();
    });

    it('returns 404 when the item does not belong to the trip', async () => {
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2', specId: '3' },
        body: { name: 'Type-C charger' },
      });

      await updateTripItemSpec(req, res);

      expectJsonStatus(res, 404, { error: 'Item not found' });
      expect(tripRepo.verifyTripSpecBelongsToItem).not.toHaveBeenCalled();
    });

    it('returns 404 when the spec does not belong to the item', async () => {
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.verifyTripSpecBelongsToItem).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2', specId: '3' },
        body: { name: 'Type-C charger' },
      });

      await updateTripItemSpec(req, res);

      expectJsonStatus(res, 404, { error: 'Spec not found' });
      expect(tripRepo.updateTripItemSpec).not.toHaveBeenCalled();
    });

    it('returns 404 when the update resolves null', async () => {
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.verifyTripSpecBelongsToItem).mockResolvedValue(true);
      vi.mocked(tripRepo.updateTripItemSpec).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2', specId: '3' },
        body: { name: 'Type-C charger' },
      });

      await updateTripItemSpec(req, res);

      expectJsonStatus(res, 404, { error: 'Spec not found' });
    });

    it('returns 200 with the updated spec', async () => {
      const spec = { id: 3, name: 'Type-C charger', storage_location: null };
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.verifyTripSpecBelongsToItem).mockResolvedValue(true);
      vi.mocked(tripRepo.updateTripItemSpec).mockResolvedValue(spec);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2', specId: '3' },
        body: { name: 'Type-C charger' },
      });

      await updateTripItemSpec(req, res);

      expect(res.json).toHaveBeenCalledWith(spec);
    });
  });

  describe('deleteTripItemSpec', () => {
    it('returns 404 when the item does not belong to the trip', async () => {
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2', specId: '3' },
      });

      await deleteTripItemSpec(req, res);

      expectJsonStatus(res, 404, { error: 'Item not found' });
      expect(tripRepo.verifyTripSpecBelongsToItem).not.toHaveBeenCalled();
    });

    it('returns 404 when the spec does not belong to the item', async () => {
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.verifyTripSpecBelongsToItem).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2', specId: '3' },
      });

      await deleteTripItemSpec(req, res);

      expectJsonStatus(res, 404, { error: 'Spec not found' });
      expect(tripRepo.deleteTripItemSpec).not.toHaveBeenCalled();
    });

    it('returns 404 when the delete resolves false', async () => {
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.verifyTripSpecBelongsToItem).mockResolvedValue(true);
      vi.mocked(tripRepo.deleteTripItemSpec).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2', specId: '3' },
      });

      await deleteTripItemSpec(req, res);

      expectJsonStatus(res, 404, { error: 'Spec not found' });
    });

    it('returns 204 on success', async () => {
      vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.verifyTripSpecBelongsToItem).mockResolvedValue(true);
      vi.mocked(tripRepo.deleteTripItemSpec).mockResolvedValue(true);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', itemId: '2', specId: '3' },
      });

      await deleteTripItemSpec(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  // ── 500 error handling (all handlers) ────────────────────────────────────

  describe('500 responses', () => {
    interface FailureCase {
      name: string;
      handler: (req: Request, res: Response) => Promise<void>;
      params?: Record<string, string>;
      body?: unknown;
      configureRejection: (error: Error) => void;
      expectedError: string;
    }

    const failureCases: FailureCase[] = [
      {
        name: 'getTemplate',
        handler: getTemplate,
        configureRejection: error =>
          vi.mocked(templateRepo.findTemplate).mockRejectedValue(error),
        expectedError: 'Failed to fetch template',
      },
      {
        name: 'addCategory',
        handler: addCategory,
        body: { name: 'Camping Gear' },
        configureRejection: error =>
          vi.mocked(templateRepo.createCategory).mockRejectedValue(error),
        expectedError: 'Failed to add category',
      },
      {
        name: 'updateCategory',
        handler: updateCategory,
        params: { catId: '1' },
        body: { name: 'Camping Gear' },
        configureRejection: error =>
          vi.mocked(templateRepo.updateCategory).mockRejectedValue(error),
        expectedError: 'Failed to update category',
      },
      {
        name: 'deleteCategory',
        handler: deleteCategory,
        params: { catId: '1' },
        configureRejection: error =>
          vi.mocked(templateRepo.deleteCategory).mockRejectedValue(error),
        expectedError: 'Failed to delete category',
      },
      {
        name: 'addItem',
        handler: addItem,
        params: { catId: '1' },
        body: { name: 'Tent' },
        configureRejection: error =>
          vi.mocked(templateRepo.createItem).mockRejectedValue(error),
        expectedError: 'Failed to add item',
      },
      {
        name: 'updateItem',
        handler: updateItem,
        params: { catId: '1', itemId: '2' },
        body: { name: 'Tent' },
        configureRejection: error =>
          vi
            .mocked(templateRepo.verifyItemBelongsToCategory)
            .mockRejectedValue(error),
        expectedError: 'Failed to update item',
      },
      {
        name: 'deleteItem',
        handler: deleteItem,
        params: { catId: '1', itemId: '2' },
        configureRejection: error =>
          vi
            .mocked(templateRepo.verifyItemBelongsToCategory)
            .mockRejectedValue(error),
        expectedError: 'Failed to delete item',
      },
      {
        name: 'getTripChecklist',
        handler: getTripChecklist,
        params: { tripId: '1' },
        configureRejection: error =>
          vi.mocked(tripRepo.findOrInitChecklist).mockRejectedValue(error),
        expectedError: 'Failed to fetch checklist',
      },
      {
        name: 'addOccasion',
        handler: addOccasion,
        params: { tripId: '1' },
        body: { name: 'Departure' },
        configureRejection: error =>
          vi.mocked(tripRepo.createOccasion).mockRejectedValue(error),
        expectedError: 'Failed to add occasion',
      },
      {
        name: 'updateOccasion',
        handler: updateOccasion,
        params: { tripId: '1', occId: '2' },
        body: { name: 'Departure' },
        configureRejection: error =>
          vi
            .mocked(tripRepo.verifyOccasionBelongsToTrip)
            .mockRejectedValue(error),
        expectedError: 'Failed to update occasion',
      },
      {
        name: 'deleteOccasion',
        handler: deleteOccasion,
        params: { tripId: '1', occId: '2' },
        configureRejection: error =>
          vi
            .mocked(tripRepo.verifyOccasionBelongsToTrip)
            .mockRejectedValue(error),
        expectedError: 'Failed to delete occasion',
      },
      {
        name: 'addTripCategory',
        handler: addTripCategory,
        params: { tripId: '1' },
        body: { name: 'Gear' },
        configureRejection: error =>
          vi.mocked(tripRepo.createTripCategory).mockRejectedValue(error),
        expectedError: 'Failed to add category',
      },
      {
        name: 'updateTripCategory',
        handler: updateTripCategory,
        params: { tripId: '1', catId: '2' },
        body: { name: 'Gear' },
        configureRejection: error =>
          vi
            .mocked(tripRepo.verifyCategoryBelongsToTrip)
            .mockRejectedValue(error),
        expectedError: 'Failed to update category',
      },
      {
        name: 'deleteTripCategory',
        handler: deleteTripCategory,
        params: { tripId: '1', catId: '2' },
        configureRejection: error =>
          vi
            .mocked(tripRepo.verifyCategoryBelongsToTrip)
            .mockRejectedValue(error),
        expectedError: 'Failed to delete category',
      },
      {
        name: 'addTripItem',
        handler: addTripItem,
        params: { tripId: '1', catId: '2' },
        body: { name: 'Pillow' },
        configureRejection: error =>
          vi
            .mocked(tripRepo.verifyCategoryBelongsToTrip)
            .mockRejectedValue(error),
        expectedError: 'Failed to add item',
      },
      {
        name: 'deleteTripItem',
        handler: deleteTripItem,
        params: { tripId: '1', itemId: '2' },
        configureRejection: error =>
          vi.mocked(tripRepo.verifyItemBelongsToTrip).mockRejectedValue(error),
        expectedError: 'Failed to delete item',
      },
      {
        name: 'updateTripItem',
        handler: updateTripItem,
        params: { tripId: '1', itemId: '2' },
        body: {},
        configureRejection: error =>
          vi.mocked(tripRepo.verifyItemBelongsToTrip).mockRejectedValue(error),
        expectedError: 'Failed to update item',
      },
      {
        name: 'setCheck',
        handler: setCheck,
        params: { tripId: '1', occId: '2', itemId: '3' },
        body: { checked: true },
        configureRejection: error =>
          vi
            .mocked(tripRepo.verifyOccasionBelongsToTrip)
            .mockRejectedValue(error),
        expectedError: 'Failed to set check',
      },
      {
        name: 'addTemplateItemSpec',
        handler: addTemplateItemSpec,
        params: { catId: '1', itemId: '2' },
        body: { name: 'Type-C charger' },
        configureRejection: error =>
          vi
            .mocked(templateRepo.verifyItemBelongsToCategory)
            .mockRejectedValue(error),
        expectedError: 'Failed to add spec',
      },
      {
        name: 'updateTemplateItemSpec',
        handler: updateTemplateItemSpec,
        params: { catId: '1', itemId: '2', specId: '3' },
        body: { name: 'Type-C charger' },
        configureRejection: error =>
          vi
            .mocked(templateRepo.verifyItemBelongsToCategory)
            .mockRejectedValue(error),
        expectedError: 'Failed to update spec',
      },
      {
        name: 'deleteTemplateItemSpec',
        handler: deleteTemplateItemSpec,
        params: { catId: '1', itemId: '2', specId: '3' },
        configureRejection: error =>
          vi
            .mocked(templateRepo.verifyItemBelongsToCategory)
            .mockRejectedValue(error),
        expectedError: 'Failed to delete spec',
      },
      {
        name: 'addTripItemSpec',
        handler: addTripItemSpec,
        params: { tripId: '1', itemId: '2' },
        body: { name: 'Type-C charger' },
        configureRejection: error =>
          vi.mocked(tripRepo.verifyItemBelongsToTrip).mockRejectedValue(error),
        expectedError: 'Failed to add spec',
      },
      {
        name: 'updateTripItemSpec',
        handler: updateTripItemSpec,
        params: { tripId: '1', itemId: '2', specId: '3' },
        body: { name: 'Type-C charger' },
        configureRejection: error =>
          vi.mocked(tripRepo.verifyItemBelongsToTrip).mockRejectedValue(error),
        expectedError: 'Failed to update spec',
      },
      {
        name: 'deleteTripItemSpec',
        handler: deleteTripItemSpec,
        params: { tripId: '1', itemId: '2', specId: '3' },
        configureRejection: error =>
          vi.mocked(tripRepo.verifyItemBelongsToTrip).mockRejectedValue(error),
        expectedError: 'Failed to delete spec',
      },
    ];

    it.each(failureCases)(
      '$name returns 500 with its error message when the repository rejects',
      async ({ handler, params, body, configureRejection, expectedError }) => {
        configureRejection(new Error('database connection lost'));
        const { req, res } = createMockReqRes({ params, body });

        await handler(req, res);

        expectJsonStatus(res, 500, { error: expectedError });
      },
    );
  });
});
