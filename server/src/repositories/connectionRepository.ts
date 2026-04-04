import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import pool from '../config/database';
import type {
  ConnectionResponse,
  CreateConnectionBody,
  UpdateConnectionBody,
} from '../types/trip';

// --- Row type ---

interface TripConnectionRow extends RowDataPacket {
  id: number;
  trip_day_id: number;
  trip_attraction_id_from: number;
  trip_attraction_id_to: number;
  transport_mode: string | null;
  duration: string | null;
  route: string | null;
  notes: string | null;
}

// --- Helper ---

function toConnectionResponse(row: TripConnectionRow): ConnectionResponse {
  return {
    id: row.id,
    fromAttractionId: row.trip_attraction_id_from,
    toAttractionId: row.trip_attraction_id_to,
    transportMode: row.transport_mode,
    duration: row.duration,
    route: row.route,
    notes: row.notes,
  };
}

// --- Repository functions ---

/** Confirms a connection is reachable through the given trip's days. */
export async function verifyBelongsToTrip(
  connectionId: number,
  tripId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT tc.id FROM trip_connections tc
     JOIN trip_days td ON td.id = tc.trip_day_id
     WHERE tc.id = ? AND td.trip_id = ?`,
    [connectionId, tripId],
  );
  return rows.length > 0;
}

export async function create(
  dayId: number,
  data: CreateConnectionBody,
): Promise<ConnectionResponse> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO trip_connections
       (trip_day_id, trip_attraction_id_from, trip_attraction_id_to,
        transport_mode, duration, route, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      dayId,
      data.fromAttractionId,
      data.toAttractionId,
      data.transportMode,
      data.duration ?? null,
      data.route ?? null,
      data.notes ?? null,
    ],
  );

  return {
    id: result.insertId,
    fromAttractionId: data.fromAttractionId,
    toAttractionId: data.toAttractionId,
    transportMode: data.transportMode,
    duration: data.duration ?? null,
    route: data.route ?? null,
    notes: data.notes ?? null,
  };
}

/** Performs a partial update. Only fields present in data are changed. */
export async function update(
  connectionId: number,
  data: UpdateConnectionBody,
): Promise<ConnectionResponse | null> {
  const [rows] = await pool.execute<TripConnectionRow[]>(
    'SELECT * FROM trip_connections WHERE id = ?',
    [connectionId],
  );
  if (rows.length === 0) {
    return null;
  }

  const cur = rows[0];

  await pool.execute(
    `UPDATE trip_connections
     SET trip_attraction_id_from = ?, trip_attraction_id_to = ?,
         transport_mode = ?, duration = ?, route = ?, notes = ?
     WHERE id = ?`,
    [
      data.fromAttractionId ?? cur.trip_attraction_id_from,
      data.toAttractionId ?? cur.trip_attraction_id_to,
      data.transportMode ?? cur.transport_mode,
      'duration' in data ? (data.duration ?? null) : cur.duration,
      'route' in data ? (data.route ?? null) : cur.route,
      'notes' in data ? (data.notes ?? null) : cur.notes,
      connectionId,
    ],
  );

  const [updatedRows] = await pool.execute<TripConnectionRow[]>(
    'SELECT * FROM trip_connections WHERE id = ?',
    [connectionId],
  );
  return toConnectionResponse(updatedRows[0]);
}

export async function deleteById(connectionId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM trip_connections WHERE id = ?',
    [connectionId],
  );
  return result.affectedRows > 0;
}
