const MIN_LENGTH = 8;
const MAX_LENGTH = 72;
const MAX_BASE = 40;

function randomDigits(count: number): string {
  const buffer = new Uint32Array(count);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (value) => String(value % 10)).join('');
}

/** "josé  o'neil" → ["Jose", "Oneil"]: letters only, accents dropped, first letter upper-cased. */
function nameWords(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z]/g, ''))
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

/**
 * A password the person can remember because it is built from what they already know:
 *
 *   full name (each word capitalised) + "@" + the digits found in their email
 *   "John Smith", "john.smith2024@acme.com" → "JohnSmith@2024"
 *
 * It always satisfies the policy: one upper case letter (first letter of the name), one lower
 * case letter, one number and one special character ("@"), and at least 8 characters. With no
 * digits in the email, three random digits are used. With no name, the part of the email before
 * the "@" stands in for it. Returns null when there is neither a name nor an email to build from.
 */
export function generateMemorablePassword(name: string, email: string): string | null {
  const local = email.trim().split('@')[0] ?? '';
  const localLetters = local.replace(/[^A-Za-z]/g, '').toLowerCase();

  let base = nameWords(name).join('');
  if (!base && localLetters) base = localLetters.charAt(0).toUpperCase() + localLetters.slice(1);
  if (!base) return null;
  base = base.slice(0, MAX_BASE);

  // Needs a lower case letter even for names like "AB".
  if (!/[a-z]/.test(base)) base += localLetters || 'x';

  let digits = local.replace(/\D/g, '').slice(0, 6);
  if (!digits) digits = randomDigits(3);

  let password = `${base}@${digits}`;
  // Very short names ("Al" + "@1"): lengthen with more digits instead of weakening the rules.
  while (password.length < MIN_LENGTH) password += randomDigits(1);
  return password.slice(0, MAX_LENGTH);
}
