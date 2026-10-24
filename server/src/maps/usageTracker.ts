import type { RowDataPacket } from 'mysql2';

import pool from '../config/database';

import { getMapsConfig } from './config';
import { getPacificDay } from './pacificTime';

/** `geocode` counts Geocoding API calls; `load` counts Maps JS API map loads. */
export type UsageKind = 'geocode' | 'load';

export interface UsageStatus {
  used: number;
  limit: number;
  exhausted: boolean;
}

interface UsageRow extends RowDataPacket {
  count: number;
  exhausted: number;
}

function limitFor(kind: UsageKind): number {
  const config = getMapsConfig();
  return kind === 'geocode' ? config.geocodeDailyLimit : config.loadDailyLimit;
}

/**
 * Reads today's (Pacific time) usage for one kind. A kind is exhausted once
 * its counter reaches the configured limit or Google reported a quota error.
 */
export async function getUsage(
  kind: UsageKind,
  now: Date = new Date(),
): Promise<UsageStatus> {
  const [rows] = await pool.execute<UsageRow[]>(
    'SELECT count, exhausted FROM maps_usage WHERE day = ? AND kind = ?',
    [getPacificDay(now), kind],
  );
  const used = rows[0]?.count ?? 0;
  const limit = limitFor(kind);
  return {
    used,
    limit,
    exhausted: Boolean(rows[0]?.exhausted) || used >= limit,
  };
}

/**
 * Reserves one request for today.
 *
 * @returns false (without counting) when the kind is already exhausted.
 */
export async function tryConsume(
  kind: UsageKind,
  now: Date = new Date(),
): Promise<boolean> {
  const usage = await getUsage(kind, now);
  if (usage.exhausted) {
    return false;
  }
  await pool.execute(
    'INSERT INTO maps_usage (day, kind, count) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE count = count + 1',
    [getPacificDay(now), kind],
  );
  return true;
}

/** Flags today's quota for a kind as used up, e.g. after Google rejected a call. */
export async function markExhausted(
  kind: UsageKind,
  now: Date = new Date(),
): Promise<void> {
  await pool.execute(
    'INSERT INTO maps_usage (day, kind, count, exhausted) VALUES (?, ?, 0, 1) ON DUPLICATE KEY UPDATE exhausted = 1',
    [getPacificDay(now), kind],
  );
}
