import type { Request, Response } from 'express';

import * as tripRepo from '../../repositories/trip';
import type { UpdateDayNotesBody } from '../../types/trip';

export async function updateDayNotes(
  req: Request,
  res: Response,
): Promise<void> {
  /* #swagger.tags = ['Trips']
     #swagger.summary = 'Update the notes for a day' */
  try {
    const tripId = Number(req.params.tripId);
    const dayId = Number(req.params.dayId);
    const body = req.body as UpdateDayNotesBody;

    const day = await tripRepo.findDayByIdAndTripId(tripId, dayId);
    if (!day) {
      res.status(404).json({ error: 'Day not found' });
      return;
    }

    const notes = body.notes?.trim() || null;
    await tripRepo.updateDayNotes(dayId, notes);
    res.json({ id: dayId, notes });
  } catch {
    res.status(500).json({ error: 'Failed to update day notes' });
  }
}
