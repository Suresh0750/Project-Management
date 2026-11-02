import { HttpError } from './httpError.js';

export const ACCOUNT_DEACTIVATED_CODE = 'ACCOUNT_DEACTIVATED';

export function accountDeactivated(): HttpError {
  return new HttpError(
    403,
    'Your account has been deactivated. Please contact your administrator or the support team.',
    [{ path: 'code', message: ACCOUNT_DEACTIVATED_CODE }],
  );
}
