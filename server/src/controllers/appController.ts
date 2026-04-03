import { Request, Response } from 'express';

import pkg from '../../package.json';

export const getHealth = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
};

export const getInfo = (_req: Request, res: Response) => {
  res.json({
    name: pkg.name,
    version: pkg.version,
  });
};
