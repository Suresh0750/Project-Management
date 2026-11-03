import type { NextFunction, Request, Response } from 'express';
import { success } from '../../utils/apiResponse.js';
import * as usersService from './users.service.js';
import type {
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
  UpdateUserStatusInput,
} from './users.validation.js';

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await usersService.listUsers(req.query as unknown as ListUsersQuery);
    res.status(200).json(success(result.users, 'Users fetched successfully', result.meta));
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.getUserById(req.params.id as string);
    res.status(200).json(success({ user }, 'User fetched successfully'));
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.createUser(req.body as CreateUserInput);
    res.status(201).json(success({ user }, 'User created successfully'));
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user, emailChange } = await usersService.updateUser(
      req.params.id as string,
      req.body as UpdateUserInput,
      req.user!.id,
    );
    res
      .status(200)
      .json(
        success(
          { user, emailChange },
          emailChange
            ? 'User updated. The new email address changes once the code sent to it is entered.'
            : 'User updated successfully',
        ),
      );
  } catch (err) {
    next(err);
  }
}

export async function confirmEmailChange(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await usersService.confirmEmailChange(
      req.params.id as string,
      (req.body as { otp: string }).otp,
    );
    res.status(200).json(success({ user }, 'Email address updated'));
  } catch (err) {
    next(err);
  }
}

export async function resendEmailChangeCode(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await usersService.resendEmailChangeCode(req.params.id as string);
    res.status(200).json(success(result, 'A new code was sent'));
  } catch (err) {
    next(err);
  }
}

export async function cancelEmailChange(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await usersService.cancelEmailChange(req.params.id as string);
    res.status(200).json(success(null, 'Email change cancelled'));
  } catch (err) {
    next(err);
  }
}

export async function updateUserStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { isActive } = req.body as UpdateUserStatusInput;
    const user = await usersService.updateUserStatus(req.params.id as string, isActive, req.user!.id);
    res.status(200).json(success({ user }, `User ${isActive ? 'activated' : 'deactivated'} successfully`));
  } catch (err) {
    next(err);
  }
}
