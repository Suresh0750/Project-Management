import { HttpError } from './httpError.js';

export const ACCOUNT_DEACTIVATED_CODE = 'ACCOUNT_DEACTIVATED';

export const ROLE_CHANGED_CODE = 'ROLE_CHANGED';

/** The person was signed out because an administrator changed their role. */
export function roleChanged(): HttpError {
  return new HttpError(
    403,
    'Your role has been changed by an administrator. Please sign in again.',
    [{ path: 'code', message: ROLE_CHANGED_CODE }],
  );
}

export function accountDeactivated(): HttpError {
  return new HttpError(
    403,
    'Your account has been deactivated. Please contact your administrator or the support team.',
    [{ path: 'code', message: ACCOUNT_DEACTIVATED_CODE }],
  );
}
