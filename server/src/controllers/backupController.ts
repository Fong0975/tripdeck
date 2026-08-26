import fs from 'fs';

import type { Request, Response } from 'express';

import * as backupRepo from '../repositories/backup';

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
  try {
    res.json(backupRepo.listAutoBackupFiles());
  } catch {
    res.status(500).json({ error: 'Failed to list automatic backups' });
  }
}

export function downloadAutoBackup(req: Request, res: Response): void {
  /* #swagger.tags = ['Backup']
     #swagger.summary = 'Download one automatic backup file'
     #swagger.parameters['filename'] = { in: 'path', required: true, schema: { type: 'string' } }
     #swagger.responses[200] = {
       description: 'Backup zip file',
       content: { 'application/zip': {} }
     } */
  try {
    const filePath = backupRepo.resolveAutoBackupPath(req.params.filename);
    if (!filePath) {
      res.status(404).json({ error: 'Backup file not found' });
      return;
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${req.params.filename}"`,
    );
    res.send(fs.readFileSync(filePath));
  } catch {
    res.status(500).json({ error: 'Failed to download automatic backup' });
  }
}
