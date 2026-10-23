import path from 'path';

import { describe, expect, it, vi } from 'vitest';

const config = vi.hoisted(() => vi.fn());
vi.mock('dotenv', () => ({ default: { config } }));

import { ROOT_ENV_PATH } from './loadEnv';

// Snapshot the import-time calls before `clearMocks` wipes them ahead of
// each test.
const importCalls = [...config.mock.calls];

describe('loadEnv', () => {
  it('points at the workspace-root .env regardless of the working directory', () => {
    const workspaceRoot = path.resolve(__dirname, '../..');

    expect(ROOT_ENV_PATH).toBe(path.join(workspaceRoot, '.env'));
  });

  it('loads that file quietly on import', () => {
    expect(importCalls).toEqual([[{ path: ROOT_ENV_PATH, quiet: true }]]);
  });
});
