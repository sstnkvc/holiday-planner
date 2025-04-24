/**
 * Represents a sequence of work days that could be used for holidays
 */
export interface WorkdaySequence {
  /** Start index of the workday sequence in the calendar array */
  startIndex: number;
  /** End index of the workday sequence in the calendar array */
  endIndex: number;
  /** Start date of the workday sequence in display format */
  startDate: string;
  /** End date of the workday sequence in display format */
  endDate: string;
  /** Length of the workday sequence */
  length: number;
}
