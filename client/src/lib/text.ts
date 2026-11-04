import { z } from 'zod';

// Zero-width characters are not removed by String.trim(), so "​" would look empty but pass a
// "required" check. Kept in step with server/src/utils/text.ts.
const INVISIBLE = /[​-‍⁠﻿]/g;

/** Free text (descriptions, comments): removes invisible characters, trims both ends. Newlines stay. */
export function cleanText(value: string): string {
  return value.replace(INVISIBLE, '').trim();
}

/** Single-line text (names, titles): as cleanText, and collapses runs of whitespace into one space. */
export function cleanLine(value: string): string {
  return cleanText(value).replace(/\s+/g, ' ');
}

/** Use as `lineString().pipe(z.string().min(2).max(100))`: the length rules see the cleaned value. */
export const lineString = () => z.string().transform(cleanLine);
export const textString = () => z.string().transform(cleanText);

/**
 * Upper-cases the first letter of every word ("john smith" -> "John Smith"). The rest of each word
 * is left as typed, so "McDonald" is not turned into "Mcdonald".
 */
export function capitalizeWords(value: string): string {
  return value.replace(/(^|[\s'’-])(\p{Ll})/gu, (_match, before: string, letter: string) =>
    before + letter.toUpperCase(),
  );
}
