import { Router } from 'express';

import * as autoBackupController from '../controllers/backup/autoBackupController';

const router = Router();

router.get('/', autoBackupController.listAutoBackups);
router.get('/:filename', autoBackupController.downloadAutoBackup);

export default router;
