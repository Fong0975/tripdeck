import fs from 'fs';

import type { Request, Response } from 'express';

import * as backupRepo from '../repositories/backup';

export function listAutoBackups(_req: Request, res: Response): void {
  try {
    res.json(backupRepo.listAutoBackupFiles());
  } catch {
    res.status(500).json({ error: 'Failed to list automatic backups' });
  }
}

export function downloadAutoBackup(req: Request, res: Response): void {
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
