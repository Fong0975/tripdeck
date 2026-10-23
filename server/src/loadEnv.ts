import path from 'path';

import dotenv from 'dotenv';

/**
 * Workspace-root `.env`, resolved from this file's location rather than the
 * working directory: `npm run dev -w server` runs from `server/`, where
 * `dotenv/config` would look for a non-existent `server/.env`. Both `src/`
 * (tsx) and `dist/` (compiled) sit two levels below the root.
 */
export const ROOT_ENV_PATH = path.resolve(__dirname, '../../.env');

// Under Docker the file doesn't exist and this is a no-op; compose injects
// the variables directly. Already-set variables are never overridden.
dotenv.config({ path: ROOT_ENV_PATH, quiet: true });
