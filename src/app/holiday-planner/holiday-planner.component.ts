import { Component, OnInit } from '@angular/core';
import { CalendarDay } from './models/day';
import { HolidayService } from './service/holiday.service';
import { PublicHoliday } from './models/holiday-response';
import { WorkdaySequence } from './models/holiday-recommendation';
import { VacationPeriod } from './models/holiday-streak';
import { CalendarService } from './services/calendar.service';
import { CALENDAR_CONSTANTS } from './constants/calendar.constants';
import { DateUtils } from './utils/date.utils';

/**
 * Main component for the holiday planner application
 */
@Component({
  selector: 'app-holiday-planner',
  templateUrl: './holiday-planner.component.html',
  styleUrls: ['./holiday-planner.component.css'],
})
export class HolidayPlannerComponent implements OnInit {
  // Calendar data
  calendarDays: CalendarDay[] = [];
  publicHolidays: PublicHoliday[] = [];

  // Form inputs
  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;
  day = new Date().getDate();
  availableVacationDays = CALENDAR_CONSTANTS.DEFAULT_VACATION_DAYS;
  fridaysFree = false;

  // Visual calendar data
  calendarMonth = this.month;
  calendarYear = this.year;
  daysInMonth = DateUtils.getDaysInMonth(this.calendarMonth, this.calendarYear);
  firstDayOfMonth = DateUtils.getFirstDayOfMonth(
    this.calendarMonth,
    this.calendarYear
  );

  // Results
  recommendedDates: string[] = [];
  vacationPeriods: VacationPeriod[] = [];
  weekendDays: string[] = [...CALENDAR_CONSTANTS.DEFAULT_WEEKEND_DAYS];

  // UI state
  showSuccessAlert = false;
  dataLoaded = false;

  /**
   * Constructor
   */
  constructor(
    private holidayService: HolidayService,
    private calendarService: CalendarService
  ) {}

  /**
   * Lifecycle hook: component initialization
   */
  async ngOnInit(): Promise<void> {
    // Fetch public holidays
    this.publicHolidays = await this.holidayService.getPublicHolidays(
      'AT',
      this.year
    );

    // Initialize calendar data
    const today = new Date();
    this.calendarMonth = today.getMonth() + 1;
    this.calendarYear = today.getFullYear();
    this.updateCalendarData();
  }

  /**
   * Updates the calendar data based on the current month and year
   */
  updateCalendarData(): void {
    this.daysInMonth = DateUtils.getDaysInMonth(
      this.calendarMonth,
      this.calendarYear
    );
    this.firstDayOfMonth = DateUtils.getFirstDayOfMonth(
      this.calendarMonth,
      this.calendarYear
    );

    // If we don't have holidays data yet, fetch it
    if (this.publicHolidays.length === 0) {
      this.holidayService
        .getPublicHolidays('AT', this.calendarYear)
        .then((holidays) => {
          this.publicHolidays = holidays;
        });
    }
  }

  /**
   * Navigate to the previous month within the current year
   */
  previousMonth(): void {
    if (this.calendarMonth > 1) {
      this.calendarMonth--;
      this.updateCalendarData();
    }
  }

  /**
   * Navigate to the next month within the current year
   */
  nextMonth(): void {
    if (this.calendarMonth < 12) {
      this.calendarMonth++;
      this.updateCalendarData();
    }
  }

  /**
   * Check if previous month navigation is disabled
   */
  isPreviousMonthDisabled(): boolean {
    return this.calendarMonth === 1;
  }

  /**
   * Check if next month navigation is disabled
   */
  isNextMonthDisabled(): boolean {
    return this.calendarMonth === 12;
  }

  /**
   * Hide the success alert
   */
  hideSuccessAlert(): void {
    this.showSuccessAlert = false;
  }

  /**
   * Handle checkbox change for Friday as weekend
   */
  checkboxChange(): void {
    this.fridaysFree = !this.fridaysFree;

    if (this.fridaysFree) {
      this.weekendDays.push('Freitag');
    } else {
      this.weekendDays = this.weekendDays.filter((day) => day !== 'Freitag');
    }

    this.hideSuccessAlert();
  }

  /**
   * Main method to calculate and display vacation recommendations
   */
  calculateHolidayRecommendations(): void {
    // Create start date
    const startDate = new Date(this.year, this.month - 1, this.day);

    // Create calendar with all days of the year
    this.calendarDays = this.calendarService.createCalendar(
      startDate,
      this.publicHolidays,
      this.weekendDays
    );

    // Find work day sequences that could be used for holidays
    const workdaySequences = this.calendarService.findWorkdaySequences(
      this.calendarDays
    );

    // Distribute available vacation days to maximize time off
    this.recommendedDates = this.calendarService.distributeVacationDays(
      this.calendarDays,
      workdaySequences,
      this.availableVacationDays
    );

    // Mark recommended days in the calendar
    this.calendarService.markRecommendedDays(
      this.calendarDays,
      this.recommendedDates
    );

    // Create and sort vacation periods
    const periods = this.calendarService.createVacationPeriods(
      this.calendarDays,
      this.recommendedDates
    );
    this.vacationPeriods =
      this.calendarService.sortVacationPeriodsByEfficiency(periods);

    // Update UI state
    this.dataLoaded = true;
    this.showSuccessAlert = true;
  }

  /**
   * Gets an array of empty cells for the calendar grid
   */
  getEmptyCells(): number[] {
    return Array(this.firstDayOfMonth)
      .fill(0)
      .map((_, i) => i);
  }

  /**
   * Gets an array of days for the current month
   */
  getDaysArray(): number[] {
    return Array(this.daysInMonth)
      .fill(0)
      .map((_, i) => i + 1);
  }

  /**
   * Checks if a day is today
   */
  isToday(day: number): boolean {
    return DateUtils.isToday(day, this.calendarMonth, this.calendarYear);
  }

  /**
   * Checks if a day is a weekend
   */
  isWeekend(day: number): boolean {
    return DateUtils.isWeekend(day, this.calendarMonth, this.calendarYear);
  }

  /**
   * Checks if a day is a holiday
   */
  isHoliday(day: number): boolean {
    // Create a date string in ISO format (YYYY-MM-DD) for the current day
    const month = this.calendarMonth.toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    const dateStr = `${this.calendarYear}-${month}-${dayStr}`;

    // Check if this date is in the holidays array
    return this.publicHolidays.some((holiday) => holiday.date === dateStr);
  }

  /**
   * Gets the full month name for the current calendar month
   */
  getMonthName(): string {
    return CALENDAR_CONSTANTS.MONTHS[this.calendarMonth - 1];
  }

  /**
   * Gets the weekday name for a date string in DD.MM.YYYY format
   *
   * @param dateString The date string in DD.MM.YYYY format
   * @returns The weekday name
   */
  getWeekdayForDate(dateString: string): string {
    const parts = dateString.split('.');
    if (parts.length !== 3) {
      return '';
    }

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
    const year = parseInt(parts[2], 10);

    const date = new Date(year, month, day);
    return CALENDAR_CONSTANTS.WEEKDAYS[date.getDay()];
  }
}
