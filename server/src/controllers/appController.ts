import { Request, Response } from 'express';

import pkg from '../../package.json';
import { createLogger } from '../logger';
import { fetchHtml, UnsafeUrlError } from '../utils/safeFetch';

const logger = createLogger('app');

const PAGE_FETCH_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
};

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
     }
     #swagger.responses[400] = {
       description: 'Missing or invalid url, disallowed protocol, or a target (or redirect target) that is not publicly routable',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: { error: { type: 'string', example: 'URL not allowed' } }
           }
         }
       }
     } */
  const url = req.query.url as string | undefined;
  if (!url) {
    logger.warn('Rejected fetch-title request with no url parameter');
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    logger.warn('Rejected fetch-title request with an unparseable url', {
      url,
    });
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    logger.warn('Rejected fetch-title request with a disallowed protocol', {
      url,
      protocol: parsed.protocol,
    });
    res.status(400).json({ error: 'Only http/https URLs are allowed' });
    return;
  }

  try {
    const html = await fetchHtml(url, { headers: PAGE_FETCH_HEADERS });
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    res.json({ title: match?.[1] ?? null });
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      logger.warn('Rejected fetch-title request for a disallowed target', {
        url,
        reason: err.message,
      });
      res.status(400).json({ error: 'URL not allowed' });
      return;
    }
    logger.error('Failed to fetch page title', { url }, err);
    res.json({ title: null });
  }
};

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
