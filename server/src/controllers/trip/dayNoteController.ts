import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as tripRepo from '../../repositories/trip';
import type { UpdateDayNotesBody } from '../../types/trip';

const logger = createLogger('day-note');

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
      logger.warn('Update-day-notes rejected: day not found', {
        tripId,
        dayId,
      });
      res.status(404).json({ error: 'Day not found' });
      return;
    }

    const notes = body.notes?.trim() || null;
    await tripRepo.updateDayNotes(dayId, notes);
    logger.debug('Day notes updated', {
      tripId,
      dayId,
      notesLength: notes?.length ?? 0,
    });
    res.json({ id: dayId, notes });
  } catch (err) {
    logger.error(
      'Failed to update day notes',
      { tripId: req.params.tripId, dayId: req.params.dayId },
      err,
    );
    res.status(500).json({ error: 'Failed to update day notes' });
  }
}
