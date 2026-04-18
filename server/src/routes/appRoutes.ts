import { Router } from 'express';

import * as appController from '../controllers/appController';

const router = Router();

router.get('/health', appController.getHealth);
router.get('/info', appController.getInfo);
router.get('/fetch-title', appController.fetchPageTitle);

export default router;
