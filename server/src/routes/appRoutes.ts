import { Router } from 'express';

import * as appController from '../controllers/appController';

const router = Router();

router.get('/health', appController.getHealth);
router.get('/info', appController.getInfo);

export default router;
