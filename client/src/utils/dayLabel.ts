import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale/zh-TW';

/**
 * Formats a day's ISO date (e.g. "2026-08-20") with a date-fns pattern in the
 * zh-TW locale, e.g. `'M/d (EEE)'` gives "8/20 (四)".
 *
 * @param date - ISO date string.
 * @param pattern - date-fns format pattern.
 * @returns The formatted label, or `date` unchanged when it cannot be parsed.
 */
export function formatDayDate(date: string, pattern: string): string {
  try {
    return format(parseISO(date), pattern, { locale: zhTW });
  } catch {
    return date;
  }
}
