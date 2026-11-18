import { describe, expect, it, vi } from 'vitest';

import {
  createMockReqRes,
  expectJsonStatus,
} from '../../../test-utils/httpMocks';
import { mockLogger } from '../../../test-utils/loggerMock';

import {
  handleAddItem,
  handleUpdateItem,
  type ItemStore,
} from './itemHandlers';
import { UNKNOWN_LOCATION_ERROR } from './locationLabelValidation';
import {
  handleAddSpec,
  handleUpdateSpec,
  type SpecStore,
} from './specHandlers';

vi.mock('../../../logger', async () => {
  const { mockLogger } = await import('../../../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

function makeItemStore(disallowed: string | null): ItemStore<{
  storage_location?: string | null;
}> {
  return {
    logger: mockLogger,
    label: 'Item',
    parentParam: 'tripId',
    verifyCategory: vi.fn().mockResolvedValue(true),
    create: vi.fn().mockResolvedValue({ id: 9 }),
    parseUpdate: body => ({
      ok: true,
      value: body as { storage_location?: string | null },
    }),
    verifyItem: vi.fn().mockResolvedValue(true),
    findDisallowedLocation: vi.fn().mockResolvedValue(disallowed),
    update: vi.fn().mockResolvedValue({ id: 9 }),
    remove: vi.fn().mockResolvedValue(true),
  };
}

function makeSpecStore(disallowed: string | null): SpecStore {
  return {
    logger: mockLogger,
    label: 'Spec',
    parentParam: 'tripId',
    verifyItem: vi.fn().mockResolvedValue(true),
    verifySpec: vi.fn().mockResolvedValue(true),
    findDisallowedLocation: vi.fn().mockResolvedValue(disallowed),
    create: vi.fn().mockResolvedValue({ id: 3 }),
    update: vi.fn().mockResolvedValue({ id: 3 }),
    remove: vi.fn().mockResolvedValue(true),
  };
}

const rejectedError = `${UNKNOWN_LOCATION_ERROR}: 手提`;

describe('handleAddItem location guard', () => {
  it.each([
    { name: 'rejects a disallowed location', disallowed: '手提', status: 400 },
    { name: 'accepts allowed locations', disallowed: null, status: 201 },
  ])('$name', async ({ disallowed, status }) => {
    const store = makeItemStore(disallowed);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
      body: { name: 'Jacket', storage_location: '手提' },
    });

    await handleAddItem(store, req, res);

    expect(store.findDisallowedLocation).toHaveBeenCalledWith('手提');
    expect(res.status).toHaveBeenCalledWith(status);
    expect(store.create).toHaveBeenCalledTimes(status === 201 ? 1 : 0);
    if (status === 400) {
      expectJsonStatus(res, 400, { error: rejectedError });
    }
  });
});

describe('handleUpdateItem location guard', () => {
  it.each([
    {
      name: 'rejects a disallowed location, passing the item id',
      body: { storage_location: '手提' },
      disallowed: '手提',
      checked: true,
      status: 400,
    },
    {
      name: 'accepts allowed locations',
      body: { storage_location: '手提' },
      disallowed: null,
      checked: true,
      status: 200,
    },
    {
      name: 'does not check a patch without storage_location',
      body: { quantity: 2 },
      disallowed: '手提',
      checked: false,
      status: 200,
    },
  ])('$name', async ({ body, disallowed, checked, status }) => {
    const store = makeItemStore(disallowed);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '7' },
      body,
    });

    await handleUpdateItem(store, req, res);

    if (checked) {
      expect(store.findDisallowedLocation).toHaveBeenCalledWith('手提', 7);
    } else {
      expect(store.findDisallowedLocation).not.toHaveBeenCalled();
    }
    expect(store.update).toHaveBeenCalledTimes(status === 200 ? 1 : 0);
    if (status === 400) {
      expectJsonStatus(res, 400, { error: rejectedError });
    }
  });
});

describe('handleAddSpec location guard', () => {
  it.each([
    { name: 'rejects a disallowed location', disallowed: '手提', status: 400 },
    { name: 'accepts allowed locations', disallowed: null, status: 201 },
  ])('$name', async ({ disallowed, status }) => {
    const store = makeSpecStore(disallowed);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
      body: { name: 'M', storage_location: '手提' },
    });

    await handleAddSpec(store, req, res);

    expect(store.findDisallowedLocation).toHaveBeenCalledWith('手提');
    expect(res.status).toHaveBeenCalledWith(status);
    expect(store.create).toHaveBeenCalledTimes(status === 201 ? 1 : 0);
  });
});

describe('handleUpdateSpec location guard', () => {
  it.each([
    { name: 'rejects a disallowed location', disallowed: '手提', status: 400 },
    { name: 'accepts allowed locations', disallowed: null, status: 200 },
  ])('$name, passing the spec id', async ({ disallowed, status }) => {
    const store = makeSpecStore(disallowed);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
      body: { name: 'M', storage_location: '手提' },
    });

    await handleUpdateSpec(store, req, res);

    expect(store.findDisallowedLocation).toHaveBeenCalledWith('手提', 3);
    expect(store.update).toHaveBeenCalledTimes(status === 200 ? 1 : 0);
    if (status === 400) {
      expectJsonStatus(res, 400, { error: rejectedError });
    }
  });
});
