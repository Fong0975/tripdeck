import { Router } from 'express';

import appRoutes from './appRoutes';
import backupRoutes from './backupRoutes';
import checklistTemplateRoutes from './checklistTemplateRoutes';
import tripRoutes from './tripRoutes';
import weatherRoutes from './weatherRoutes';

const router = Router();

router.use('/', appRoutes);
router.use('/backups', backupRoutes);
router.use('/trips', tripRoutes);
router.use('/checklist-template', checklistTemplateRoutes);
router.use('/weather', weatherRoutes);

export default router;
