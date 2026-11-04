const dateFormatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

// Project dates are calendar dates stored at UTC midnight; formatting in the viewer's
// timezone could show the previous day.
const utcDateFormatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });

export function formatCalendarDate(value: string): string {
  return utcDateFormatter.format(new Date(value));
}

/** Today in the browser's time zone as an <input type="date"> value (YYYY-MM-DD). */
export function todayInputValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** ISO timestamp → value for <input type="date"> (YYYY-MM-DD). */
export function toDateInputValue(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' });
const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "5 min. ago", "yesterday", … Falls back to "just now" for the last minute. */
export function formatRelativeTime(value: string): string {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) return relativeFormatter.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

const STATUS_WORDS: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  COMPLETED: 'Completed',
};

/**
 * Notification and activity messages are stored as text. Older rows contain raw status codes
 * ("moved to IN_PROGRESS"); show them the way the rest of the app labels them.
 */
export function readableMessage(message: string): string {
  return message.replace(/\b(TODO|IN_PROGRESS|IN_REVIEW|COMPLETED)\b/g, (code) => STATUS_WORDS[code] ?? code);
}
