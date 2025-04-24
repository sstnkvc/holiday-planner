/**
 * Utility functions for date operations
 */
export class DateUtils {
  /**
   * Formats a date string from local format (DD.MM.YYYY) to ISO format (YYYY-MM-DD)
   * 
   * @param dateString The date string in local format
   * @returns The date string in ISO format
   */
  static formatToIsoDate(dateString: string): string {
    const parts = dateString.split('.');
    if (parts.length !== 3) {
      throw new Error(`Invalid date format: ${dateString}. Expected DD.MM.YYYY`);
    }
    
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];

    return `${year}-${month}-${day}`;
  }

  /**
   * Gets the number of days in a month
   * 
   * @param month The month (1-12)
   * @param year The year
   * @returns The number of days in the month
   */
  static getDaysInMonth(month: number, year: number): number {
    // Month is 1-indexed in our app but 0-indexed in JavaScript Date
    return new Date(year, month, 0).getDate();
  }

  /**
   * Gets the first day of the month (0 = Monday, 6 = Sunday)
   * 
   * @param month The month (1-12)
   * @param year The year
   * @returns The day of the week for the first day of the month (0-6, Monday-based)
   */
  static getFirstDayOfMonth(month: number, year: number): number {
    // Month is 1-indexed in our app but 0-indexed in JavaScript Date
    // Convert Sunday-based (0-6) to Monday-based (0-6)
    const day = new Date(year, month - 1, 1).getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday (0) to 6, and shift others by -1
  }

  /**
   * Checks if a specific day is today
   * 
   * @param day The day of the month
   * @param month The month (1-12)
   * @param year The year
   * @returns True if the specified date is today
   */
  static isToday(day: number, month: number, year: number): boolean {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() + 1 &&
      year === today.getFullYear()
    );
  }

  /**
   * Checks if a specific day is a weekend (Saturday or Sunday)
   * 
   * @param day The day of the month
   * @param month The month (1-12)
   * @param year The year
   * @returns True if the specified date is a weekend
   */
  static isWeekend(day: number, month: number, year: number): boolean {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
  }
}
