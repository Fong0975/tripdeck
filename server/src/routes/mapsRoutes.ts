import { Router } from 'express';

import * as mapsController from '../controllers/mapsController';

const router = Router();

router.get('/status', mapsController.getMapsStatus);
router.get('/config', mapsController.getMapsConfigForBrowser);
router.post('/resolve', mapsController.resolveGeo);
router.post('/report-error', mapsController.reportMapsError);

export default router;
