import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChecklistTemplateResponse } from '../../types/checklist';

const mockConnBeginTransaction = vi.fn();
const mockConnExecute = vi.fn();
const mockConnCommit = vi.fn();
const mockConnRollback = vi.fn();
const mockConnRelease = vi.fn();
const mockGetConnection = vi.fn();

vi.mock('../../config/database', () => ({
  default: {
    getConnection: () => mockGetConnection(),
  },
}));

import { restoreTemplate } from './templateRestore';

function makeConn() {
  return {
    beginTransaction: mockConnBeginTransaction,
    execute: mockConnExecute,
    commit: mockConnCommit,
    rollback: mockConnRollback,
    release: mockConnRelease,
  };
}

/**
 * Assigns fresh insertIds to the category/item inserts, so tests can assert
 * later inserts (items, specs) use the *new* ids.
 */
function mockSequentialInserts() {
  mockConnExecute.mockImplementation((sql: string) => {
    if (sql.startsWith('INSERT INTO checklist_template_categories')) {
      return Promise.resolve([{ insertId: 7000 }]);
    }
    if (sql.startsWith('INSERT INTO checklist_template_items')) {
      return Promise.resolve([{ insertId: 8000 }]);
    }
    return Promise.resolve([{ affectedRows: 1 }]);
  });
}

const sampleTemplate: ChecklistTemplateResponse = {
  categories: [
    {
      id: 1,
      name: 'Documents',
      items: [
        {
          id: 1,
          name: 'Passport',
          quantity: 1,
          notes: null,
          storage_location: null,
          specs: [{ id: 1, name: 'Size M', storage_location: null }],
        },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetConnection.mockResolvedValue(makeConn());
});

describe('restoreTemplate', () => {
  it('clears the existing template and re-inserts categories, items, and specs with remapped ids', async () => {
    mockSequentialInserts();

    await restoreTemplate(sampleTemplate);

    expect(mockConnExecute).toHaveBeenCalledWith(
      'DELETE FROM checklist_template_categories',
    );
    expect(mockConnExecute).toHaveBeenCalledWith(
      'INSERT INTO checklist_template_categories (name) VALUES (?)',
      ['Documents'],
    );
    expect(mockConnExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO checklist_template_items'),
      [7000, 'Passport', 1, null, null],
    );
    expect(mockConnExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO checklist_template_item_specs'),
      [8000, 'Size M', null],
    );
    expect(mockConnCommit).toHaveBeenCalled();
    expect(mockConnRollback).not.toHaveBeenCalled();
  });

  it('clears the existing template even when the new one has no categories', async () => {
    mockSequentialInserts();

    await restoreTemplate({ categories: [] });

    expect(mockConnExecute).toHaveBeenCalledWith(
      'DELETE FROM checklist_template_categories',
    );
    expect(mockConnExecute).not.toHaveBeenCalledWith(
      'INSERT INTO checklist_template_categories (name) VALUES (?)',
      expect.anything(),
    );
    expect(mockConnCommit).toHaveBeenCalled();
  });

  it('rolls back and rethrows when an insert fails', async () => {
    mockConnExecute.mockImplementation((sql: string) => {
      if (sql.startsWith('INSERT INTO checklist_template_categories')) {
        return Promise.reject(new Error('db error'));
      }
      return Promise.resolve([{ affectedRows: 1 }]);
    });

    await expect(restoreTemplate(sampleTemplate)).rejects.toThrow('db error');

    expect(mockConnRollback).toHaveBeenCalled();
    expect(mockConnCommit).not.toHaveBeenCalled();
    expect(mockConnRelease).toHaveBeenCalled();
  });
});
