import { Request, Response } from 'express';

import pkg from '../../package.json';

export const getHealth = (_req: Request, res: Response) => {
  /* #swagger.tags = ['System']
     #swagger.summary = 'Health check'
     #swagger.responses[200] = {
       description: 'Server is healthy',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               status: { type: 'string', example: 'ok' },
               timestamp: { type: 'string', format: 'date-time', example: '2024-05-10T08:00:00.000Z' }
             }
           }
         }
       }
     } */
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
};

export const getInfo = (_req: Request, res: Response) => {
  /* #swagger.tags = ['System']
     #swagger.summary = 'Application info'
     #swagger.responses[200] = {
       description: 'Application name and version',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               name: { type: 'string', example: '@tripdeck/server' },
               version: { type: 'string', example: '1.0.0' }
             }
           }
         }
       }
     } */
  res.json({
    name: pkg.name,
    version: pkg.version,
  });
};
