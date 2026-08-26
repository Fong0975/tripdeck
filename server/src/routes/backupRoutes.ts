import { Router } from 'express';

import * as backupController from '../controllers/backupController';

const router = Router();

router.get('/', backupController.listAutoBackups);
router.get('/:filename', backupController.downloadAutoBackup);

export default router;
