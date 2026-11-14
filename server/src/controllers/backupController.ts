import type { NextFunction, Request, Response } from 'express';

import { createLogger } from '../logger';
import * as backupRepo from '../repositories/backup';

const logger = createLogger('backup');

export function listAutoBackups(_req: Request, res: Response): void {
  /* #swagger.tags = ['Backup']
     #swagger.summary = 'List automatic backups'
     #swagger.responses[200] = {
       description: 'Every automatic backup currently on disk, newest first',
       content: {
         'application/json': {
           schema: {
             type: 'array',
             items: {
               type: 'object',
               properties: {
                 filename: { type: 'string', example: 'tripdeck-auto-backup-2026-08-26T00-00-00-000Z.zip' },
                 sizeBytes: { type: 'integer', example: 2048 },
                 createdAt: { type: 'string', format: 'date-time', example: '2026-08-26T00:00:00.000Z' }
               }
             }
           }
         }
       }
     } */
  res.json(backupRepo.listAutoBackupFiles());
}

/**
 * Streams one automatic backup file to the client as a zip download, without
 * buffering it in memory. A failure before any bytes were sent is passed to
 * the error handler; a failure mid-stream (e.g. the client disconnected) is
 * only logged, since the response can no longer be changed.
 *
 * @param req - Request carrying the backup `filename` route parameter.
 * @param res - Response the file is streamed to.
 * @param next - Receives a read error that occurred before headers were sent.
 */
export function downloadAutoBackup(
  req: Request<{ filename: string }>,
  res: Response,
  next: NextFunction,
): void {
  /* #swagger.tags = ['Backup']
     #swagger.summary = 'Download one automatic backup file'
     #swagger.parameters['filename'] = { in: 'path', required: true, schema: { type: 'string' } }
     #swagger.responses[200] = {
       description: 'Backup zip file',
       content: { 'application/zip': {} }
     } */
  const filePath = backupRepo.resolveAutoBackupPath(req.params.filename);
  if (!filePath) {
    logger.warn('Requested automatic backup file not found', {
      filename: req.params.filename,
    });
    res.status(404).json({ error: 'Backup file not found' });
    return;
  }

  res.setHeader('Content-Type', 'application/zip');
  res.download(filePath, req.params.filename, err => {
    if (!err) {
      return;
    }
    if (res.headersSent) {
      logger.warn('Automatic backup download aborted mid-stream', {
        filename: req.params.filename,
        reason: err.message,
      });
      return;
    }
    next(err);
  });
}
