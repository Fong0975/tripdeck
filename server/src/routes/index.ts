import { Router } from 'express';

import appRoutes from './appRoutes';

const router = Router();

router.use('/', appRoutes);

export default router;
