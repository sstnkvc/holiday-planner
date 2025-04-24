import { Injectable } from '@angular/core';
import { CalendarDay } from '../models/day';
import { PublicHoliday } from '../models/holiday-response';
import { WorkdaySequence } from '../models/holiday-recommendation';
import { VacationPeriod } from '../models/holiday-streak';
import { CALENDAR_CONSTANTS } from '../constants/calendar.constants';
import { DateUtils } from '../utils/date.utils';

/**
 * Service for calendar operations and vacation planning
 */
@Injectable({
  providedIn: 'root',
})
export class CalendarService {
  /**
   * Creates a calendar for the selected year with all days marked as free or work days
   *
   * @param startDate The start date for the calendar
   * @param publicHolidays List of public holidays
   * @param weekendDays List of weekday names considered as weekend
   * @returns Array of calendar days
   */
  createCalendar(
    startDate: Date,
    publicHolidays: PublicHoliday[],
    weekendDays: string[] = CALENDAR_CONSTANTS.DEFAULT_WEEKEND_DAYS
  ): CalendarDay[] {
    const calendar: CalendarDay[] = [];
    const year = startDate.getFullYear();

    // Create a date object for the first day of the selected period
    let currentDate = new Date(startDate);

    // Generate all days for the year
    while (currentDate.getFullYear() === year) {
      const displayDate = currentDate.toLocaleDateString();
      const isoDate = DateUtils.formatToIsoDate(displayDate);
      const weekdayName = CALENDAR_CONSTANTS.WEEKDAYS[currentDate.getDay()];

      // Create day object
      calendar.push({
        displayDate,
        isoDate,
        weekdayName,
        isFreeDay: weekendDays.includes(weekdayName),
        isRecommendedHoliday: false,
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Mark holidays as free days
    this.markHolidaysAsFree(calendar, publicHolidays);

    return calendar;
  }

  /**
   * Marks holidays as free days in the calendar
   *
   * @param calendar The calendar to update
   * @param publicHolidays List of public holidays
   */
  private markHolidaysAsFree(
    calendar: CalendarDay[],
    publicHolidays: PublicHoliday[]
  ): void {
    // Get all holiday dates
    const holidayDates = publicHolidays.map((holiday) => holiday.date);

    // Mark matching days as free
    for (const day of calendar) {
      if (holidayDates.includes(day.isoDate)) {
        day.isFreeDay = true;
      }
    }
  }

  /**
   * Finds sequences of work days that could be used for holidays
   *
   * @param calendar The calendar to analyze
   * @returns Array of workday sequences
   */
  findWorkdaySequences(calendar: CalendarDay[]): WorkdaySequence[] {
    const sequences: WorkdaySequence[] = [];
    let workDayStart: number | undefined = undefined;

    // Scan through the calendar to find work day sequences
    for (let i = 0; i < calendar.length; i++) {
      const day = calendar[i];

      // If this is a work day (not free)
      if (!day.isFreeDay) {
        // Mark the start of a work day sequence if we haven't already
        if (workDayStart === undefined) {
          workDayStart = i;
        }
      }
      // If this is a free day or the last day of the calendar
      else if (workDayStart !== undefined) {
        // We've found the end of a work day sequence
        const workDayEnd = i - 1;

        // Create a sequence object for this sequence
        sequences.push({
          startIndex: workDayStart,
          endIndex: workDayEnd,
          startDate: calendar[workDayStart].displayDate,
          endDate: calendar[workDayEnd].displayDate,
          length: workDayEnd - workDayStart + 1,
        });

        // Reset for the next sequence
        workDayStart = undefined;
      }
    }

    // Handle case where the year ends with work days
    if (workDayStart !== undefined) {
      const workDayEnd = calendar.length - 1;
      sequences.push({
        startIndex: workDayStart,
        endIndex: workDayEnd,
        startDate: calendar[workDayStart].displayDate,
        endDate: calendar[workDayEnd].displayDate,
        length: workDayEnd - workDayStart + 1,
      });
    }

    return sequences;
  }

  /**
   * Distributes available vacation days to maximize time off
   *
   * This method uses a greedy approach to distribute vacation days:
   * 1. Sort workday sequences by length (shortest first)
   * 2. For each sequence, calculate potential efficiency (free days gained / vacation days used)
   * 3. Prioritize sequences with higher potential efficiency
   *
   * @param calendar The calendar to update
   * @param workdaySequences Sequences of workdays
   * @param availableVacationDays Number of available vacation days
   * @returns Recommended dates for taking vacation
   */
  distributeVacationDays(
    calendar: CalendarDay[],
    workdaySequences: WorkdaySequence[],
    availableVacationDays: number
  ): string[] {
    let remainingVacationDays = availableVacationDays;
    const recommendedDates: string[] = [];

    // Calculate potential efficiency for each sequence
    const sequencesWithEfficiency = workdaySequences.map((sequence) => {
      // Find adjacent free days (before and after the sequence)
      let freeDaysBefore = 0;
      let index = sequence.startIndex - 1;
      while (index >= 0 && calendar[index].isFreeDay) {
        freeDaysBefore++;
        index--;
      }

      let freeDaysAfter = 0;
      index = sequence.endIndex + 1;
      while (index < calendar.length && calendar[index].isFreeDay) {
        freeDaysAfter++;
        index++;
      }

      // Calculate potential efficiency (total free days / vacation days)
      const potentialFreeDays =
        freeDaysBefore + freeDaysAfter + sequence.length;
      const potentialEfficiency = potentialFreeDays / sequence.length;

      return {
        ...sequence,
        potentialEfficiency,
      };
    });

    // Sort sequences by potential efficiency (highest first), then by length (shortest first)
    const sortedSequences = [...sequencesWithEfficiency].sort((a, b) => {
      if (a.potentialEfficiency !== b.potentialEfficiency) {
        return b.potentialEfficiency - a.potentialEfficiency;
      }
      return a.length - b.length;
    });

    // Distribute vacation days
    sortedSequences.forEach((sequence) => {
      if (remainingVacationDays <= 0) return;

      // If we don't have enough vacation days for the entire sequence,
      // prioritize days that connect to existing free days
      if (sequence.length > remainingVacationDays) {
        // Find the best subset of days to use
        const bestDays = this.findBestDaysSubset(
          calendar,
          sequence,
          remainingVacationDays
        );

        recommendedDates.push(...bestDays);
        remainingVacationDays -= bestDays.length;
      } else {
        // We have enough vacation days for the entire sequence
        let currentIndex = sequence.startIndex;
        const endIndex = sequence.endIndex;

        // Add dates from this sequence
        while (currentIndex <= endIndex && remainingVacationDays > 0) {
          const date = calendar[currentIndex].displayDate;
          recommendedDates.push(date);
          currentIndex++;
          remainingVacationDays--;
        }
      }
    });

    return recommendedDates;
  }

  /**
   * Finds the best subset of days to use vacation days on
   *
   * @param calendar The calendar
   * @param sequence The workday sequence
   * @param availableDays Number of available vacation days
   * @returns Array of dates to use vacation days on
   */
  private findBestDaysSubset(
    calendar: CalendarDay[],
    sequence: WorkdaySequence & { potentialEfficiency: number },
    availableDays: number
  ): string[] {
    // If the sequence is at the beginning or end of the calendar,
    // prioritize days that connect to the edge
    const isAtStart = sequence.startIndex === 0;
    const isAtEnd = sequence.endIndex === calendar.length - 1;

    // If the sequence is adjacent to free days, prioritize days that connect to them
    const hasFreeDaysBefore =
      sequence.startIndex > 0 && calendar[sequence.startIndex - 1].isFreeDay;
    const hasFreeDaysAfter =
      sequence.endIndex < calendar.length - 1 &&
      calendar[sequence.endIndex + 1].isFreeDay;

    const selectedDates: string[] = [];

    if (hasFreeDaysBefore && hasFreeDaysAfter) {
      // If we have free days on both sides, distribute vacation days evenly
      const daysFromStart = Math.ceil(availableDays / 2);
      const daysFromEnd = availableDays - daysFromStart;

      // Add days from the start
      for (let i = 0; i < daysFromStart; i++) {
        const index = sequence.startIndex + i;
        if (index <= sequence.endIndex) {
          selectedDates.push(calendar[index].displayDate);
        }
      }

      // Add days from the end
      for (let i = 0; i < daysFromEnd; i++) {
        const index = sequence.endIndex - i;
        if (
          index >= sequence.startIndex &&
          !selectedDates.includes(calendar[index].displayDate)
        ) {
          selectedDates.push(calendar[index].displayDate);
        }
      }
    } else if (hasFreeDaysBefore || isAtStart) {
      // If we have free days before or are at the start, prioritize days from the start
      for (let i = 0; i < availableDays; i++) {
        const index = sequence.startIndex + i;
        if (index <= sequence.endIndex) {
          selectedDates.push(calendar[index].displayDate);
        }
      }
    } else if (hasFreeDaysAfter || isAtEnd) {
      // If we have free days after or are at the end, prioritize days from the end
      for (let i = 0; i < availableDays; i++) {
        const index = sequence.endIndex - i;
        if (index >= sequence.startIndex) {
          selectedDates.push(calendar[index].displayDate);
        }
      }
    } else {
      // If no free days on either side, just take days from the start
      for (let i = 0; i < availableDays; i++) {
        const index = sequence.startIndex + i;
        if (index <= sequence.endIndex) {
          selectedDates.push(calendar[index].displayDate);
        }
      }
    }

    return selectedDates;
  }

  /**
   * Marks the recommended days in the calendar
   *
   * @param calendar The calendar to update
   * @param recommendedDates Dates recommended for taking vacation
   */
  markRecommendedDays(
    calendar: CalendarDay[],
    recommendedDates: string[]
  ): void {
    recommendedDates.forEach((date) => {
      const day = calendar.find((day) => day.displayDate === date);
      if (day) {
        day.isRecommendedHoliday = true;
      }
    });
  }

  /**
   * Creates vacation periods from recommended dates
   *
   * @param calendar The calendar
   * @param recommendedDates Dates recommended for taking vacation
   * @returns Array of vacation periods
   */
  createVacationPeriods(
    calendar: CalendarDay[],
    recommendedDates: string[]
  ): VacationPeriod[] {
    const processedDates = new Set<string>();
    const periods: VacationPeriod[] = [];

    // Process each recommended date
    for (const date of recommendedDates) {
      // Skip if we've already included this date in a period
      if (processedDates.has(date)) continue;

      // Find the index of this date in the calendar
      const dateIndex = calendar.findIndex((day) => day.displayDate === date);
      if (dateIndex === -1) continue;

      // Find all connected free days (before and after)
      const period = this.findConnectedFreeDays(calendar, dateIndex);

      // Add all dates in this period to the processed set
      period.dates.forEach((d) => processedDates.add(d));

      // Add the period to our results
      periods.push(period);
    }

    return periods;
  }

  /**
   * Finds all connected free days starting from a given index
   *
   * @param calendar The calendar
   * @param startIndex The index to start from
   * @returns A vacation period
   */
  private findConnectedFreeDays(
    calendar: CalendarDay[],
    startIndex: number
  ): VacationPeriod {
    const dates: string[] = [];
    const vacationDates: string[] = [];

    // Look backward for connected free days
    let index = startIndex;
    while (index >= 0) {
      const day = calendar[index];
      if (!day.isFreeDay && !day.isRecommendedHoliday) break;

      dates.unshift(day.displayDate); // Add to beginning of array
      if (day.isRecommendedHoliday) {
        vacationDates.unshift(day.displayDate);
      }
      index--;
    }

    // Look forward for connected free days
    index = startIndex + 1;
    while (index < calendar.length) {
      const day = calendar[index];
      if (!day.isFreeDay && !day.isRecommendedHoliday) break;

      dates.push(day.displayDate); // Add to end of array
      if (day.isRecommendedHoliday) {
        vacationDates.push(day.displayDate);
      }
      index++;
    }

    // Calculate efficiency ratio
    const totalDays = dates.length;
    const requiredVacationDays = vacationDates.length;
    const efficiencyRatio =
      requiredVacationDays > 0 ? totalDays / requiredVacationDays : 0;

    return {
      dates,
      totalDays,
      requiredVacationDays,
      vacationDates,
      efficiencyRatio,
    };
  }

  /**
   * Sorts vacation periods by efficiency ratio (highest first), then by total days
   *
   * @param periods The vacation periods to sort
   * @returns Sorted vacation periods
   */
  sortVacationPeriodsByEfficiency(periods: VacationPeriod[]): VacationPeriod[] {
    return [...periods].sort((a, b) => {
      // First prioritize by efficiency ratio (highest first)
      if (a.efficiencyRatio !== b.efficiencyRatio) {
        return b.efficiencyRatio - a.efficiencyRatio;
      }

      // If efficiency ratio is the same, prioritize by period length (longest first)
      if (a.totalDays !== b.totalDays) {
        return b.totalDays - a.totalDays;
      }

      // If period length is the same, prioritize by fewer vacation days needed
      return a.requiredVacationDays - b.requiredVacationDays;
    });
  }
}
