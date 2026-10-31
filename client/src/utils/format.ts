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

/** ISO timestamp → value for <input type="date"> (YYYY-MM-DD). */
export function toDateInputValue(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}
