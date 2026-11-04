import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { runWithRequest } from '../utils/requestContext.js';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  req.requestId = incoming && incoming.length > 0 ? incoming : randomUUID();
  res.setHeader('x-request-id', req.requestId);
  // Everything that runs because of this request can now log with its id.
  runWithRequest(
    { requestId: req.requestId, method: req.method, path: req.originalUrl.split('?')[0] ?? '' },
    next,
  );
}
