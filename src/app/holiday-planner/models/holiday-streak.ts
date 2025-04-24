/**
 * Represents a continuous sequence of free days (including recommended holidays)
 */
export interface VacationPeriod {
  /** All dates in this vacation period */
  dates: string[];
  /** Total number of days in this vacation period */
  totalDays: number;
  /** Number of vacation days needed to achieve this period */
  requiredVacationDays: number;
  /** Dates that need to be taken as vacation days */
  vacationDates: string[];
  /** Efficiency ratio (total days off per vacation day used) */
  efficiencyRatio: number;
}
