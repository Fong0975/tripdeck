import { Router } from 'express';

import appRoutes from './appRoutes';
import backupRoutes from './backupRoutes';
import checklistTemplateRoutes from './checklistTemplateRoutes';
import tripRoutes from './tripRoutes';

const router = Router();

router.use('/', appRoutes);
router.use('/backups', backupRoutes);
router.use('/trips', tripRoutes);
router.use('/checklist-template', checklistTemplateRoutes);

export default router;
