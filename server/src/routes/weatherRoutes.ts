import { Router } from 'express';

import * as weatherController from '../controllers/weatherController';

const router = Router();

router.get('/', weatherController.getWeather);
router.get('/status', weatherController.getWeatherStatus);

export default router;
