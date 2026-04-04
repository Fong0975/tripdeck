import { Router } from 'express';

import appRoutes from './appRoutes';
import tripRoutes from './tripRoutes';

const router = Router();

router.use('/', appRoutes);
router.use('/trips', tripRoutes);

export default router;
