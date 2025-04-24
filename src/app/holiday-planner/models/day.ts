/**
 * Represents a day in the calendar
 */
export interface CalendarDay {
  /** Date in local format (e.g., "01.01.2023") */
  displayDate: string;
  /** Date in ISO format (e.g., "2023-01-01") */
  isoDate: string;
  /** Name of the weekday (e.g., "Montag") */
  weekdayName: string;
  /** Whether this day is a weekend or holiday */
  isFreeDay: boolean;
  /** Whether this day is recommended for taking a holiday */
  isRecommendedHoliday: boolean;
}
