import { Request, Response } from 'express';

export const fetchPageTitle = async (
  req: Request,
  res: Response,
): Promise<void> => {
  /* #swagger.tags = ['System']
     #swagger.summary = 'Fetch page title via server-side proxy'
     #swagger.parameters['url'] = { in: 'query', required: true, schema: { type: 'string' } }
     #swagger.responses[200] = {
       description: 'Page title or null if unavailable',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: { title: { type: 'string', nullable: true } }
           }
         }
       }
     } */
  const url = req.query.url as string | undefined;
  if (!url) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    res.status(400).json({ error: 'Only http/https URLs are allowed' });
    return;
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
      },
    });
    const html = await response.text();
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    res.json({ title: match?.[1] ?? null });
  } catch {
    res.json({ title: null });
  }
};

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
