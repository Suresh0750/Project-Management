import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { HttpError } from '../utils/httpError.js';


export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new HttpError(401, 'Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new HttpError(403, 'You do not have permission to perform this action'));
      return;
    }

    next();
  };
}
