import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Wraps an async route handler so a rejection reaches the error middleware. */
export function asyncHandler(fn: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}
