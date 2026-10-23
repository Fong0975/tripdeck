import { Request, Response } from 'express';

import { createLogger } from '../logger';
import { getDailyWeather, isWeatherEnabled } from '../weather/weatherService';

const logger = createLogger('weather');

const MAX_LOCATION_LENGTH = 100;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INTEGER_PATTERN = /^-?\d+$/;

export const getWeatherStatus = (_req: Request, res: Response) => {
  /* #swagger.tags = ['Weather']
     #swagger.summary = 'Whether a weather provider is configured'
     #swagger.responses[200] = {
       description: 'Weather feature availability',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: { enabled: { type: 'boolean', example: true } }
           }
         }
       }
     } */
  res.json({ enabled: isWeatherEnabled() });
};

export const getWeather = async (
  req: Request,
  res: Response,
): Promise<void> => {
  /* #swagger.tags = ['Weather']
     #swagger.summary = 'Daily weather for a place, proxied to OpenWeatherMap / Visual Crossing'
     #swagger.parameters['location'] = { in: 'query', required: true, schema: { type: 'string', maxLength: 100 } }
     #swagger.parameters['date'] = { in: 'query', required: true, schema: { type: 'string', format: 'date' } }
     #swagger.parameters['days'] = { in: 'query', required: true, description: 'Days between the client\'s local today and date', schema: { type: 'integer' } }
     #swagger.responses[200] = {
       description: 'Weather lookup result',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               status: { type: 'string', enum: ['success', 'not_found', 'out_of_range', 'error'] },
               data: {
                 type: 'object',
                 properties: {
                   resolvedName: { type: 'string' },
                   icon: { type: 'string' },
                   description: { type: 'string' },
                   tempMin: { type: 'number' },
                   tempMax: { type: 'number' },
                   humidity: { type: 'number' },
                   pop: { type: 'number' }
                 }
               }
             }
           }
         }
       }
     }
     #swagger.responses[400] = { description: 'Invalid query parameters' } */
  const location = (req.query.location as string | undefined)?.trim();
  const date = req.query.date as string | undefined;
  const days = req.query.days as string | undefined;

  if (!location || location.length > MAX_LOCATION_LENGTH) {
    logger.warn('Rejected weather request with an invalid location', {
      location,
    });
    res.status(400).json({ error: 'Invalid location parameter' });
    return;
  }
  if (!date || !DATE_PATTERN.test(date)) {
    logger.warn('Rejected weather request with an invalid date', { date });
    res.status(400).json({ error: 'Invalid date parameter' });
    return;
  }
  if (!days || !INTEGER_PATTERN.test(days)) {
    logger.warn('Rejected weather request with an invalid days value', {
      days,
    });
    res.status(400).json({ error: 'Invalid days parameter' });
    return;
  }

  if (!isWeatherEnabled()) {
    res.json({ status: 'error' });
    return;
  }

  res.json(await getDailyWeather(location, date, Number(days)));
};
