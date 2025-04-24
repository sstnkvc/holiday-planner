import {
  Component,
  OnInit,
  AfterViewChecked,
  QueryList,
  ViewChildren,
  ElementRef,
} from '@angular/core';
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
export class HolidayPlannerComponent implements OnInit, AfterViewChecked {
  @ViewChildren('calendarGrid') calendarGrids!: QueryList<ElementRef>;
  // Calendar data
  calendarDays: CalendarDay[] = [];
  publicHolidays: PublicHoliday[] = [];

  // Form inputs
  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;
  day = new Date().getDate();
  availableVacationDays = CALENDAR_CONSTANTS.DEFAULT_VACATION_DAYS;
  fridaysFree = false;
  saturdayWorkday = false;

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

    // Initialize weekend days
    this.weekendDays = [...CALENDAR_CONSTANTS.DEFAULT_WEEKEND_DAYS];

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
   * Handle checkbox change for Saturday as workday
   */
  saturdayCheckboxChange(): void {
    this.saturdayWorkday = !this.saturdayWorkday;

    if (this.saturdayWorkday) {
      // Remove Saturday from weekend days if it's considered a workday
      this.weekendDays = this.weekendDays.filter((day) => day !== 'Samstag');
    } else {
      // Add Saturday back to weekend days if it's not already there
      if (!this.weekendDays.includes('Samstag')) {
        this.weekendDays.push('Samstag');
      }
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
    const date = new Date(this.calendarYear, this.calendarMonth - 1, day);
    const dayOfWeek = date.getDay();

    // If Saturday is a workday, don't consider it a weekend
    if (dayOfWeek === 6 && this.saturdayWorkday) {
      return false;
    }

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

  /**
   * Gets the total number of vacation days used across all vacation periods
   *
   * @returns The total number of vacation days used
   */
  getTotalVacationDaysUsed(): number {
    if (!this.vacationPeriods || this.vacationPeriods.length === 0) {
      return 0;
    }

    // Create a Set to avoid counting the same date multiple times
    const uniqueVacationDates = new Set<string>();

    // Add all vacation dates from all periods to the set
    this.vacationPeriods.forEach((period) => {
      period.vacationDates.forEach((date) => {
        uniqueVacationDates.add(date);
      });
    });

    return uniqueVacationDates.size;
  }

  /**
   * Gets the total number of free days across all vacation periods
   *
   * @returns The total number of free days
   */
  getTotalFreeDays(): number {
    if (!this.vacationPeriods || this.vacationPeriods.length === 0) {
      return 0;
    }

    // Create a Set to avoid counting the same date multiple times
    const uniqueFreeDates = new Set<string>();

    // Add all dates from all periods to the set
    this.vacationPeriods.forEach((period) => {
      period.dates.forEach((date) => {
        uniqueFreeDates.add(date);
      });
    });

    return uniqueFreeDates.size;
  }

  /**
   * Gets the number of public holidays included in the vacation periods
   *
   * @returns The number of public holidays
   */
  getPublicHolidaysCount(): number {
    if (
      !this.vacationPeriods ||
      this.vacationPeriods.length === 0 ||
      !this.publicHolidays
    ) {
      return 0;
    }

    // Create a Set of all dates in all vacation periods
    const allVacationDates = new Set<string>();
    this.vacationPeriods.forEach((period) => {
      period.dates.forEach((date) => {
        allVacationDates.add(date);
      });
    });

    // Convert display dates (DD.MM.YYYY) to ISO format (YYYY-MM-DD) for comparison
    const isoVacationDates = Array.from(allVacationDates)
      .map((date) => {
        try {
          return DateUtils.formatToIsoDate(date);
        } catch (e) {
          return '';
        }
      })
      .filter((date) => date !== '');

    // Count how many public holidays are within the vacation periods
    return this.publicHolidays.filter((holiday) =>
      isoVacationDates.includes(holiday.date)
    ).length;
  }

  /**
   * Gets an array of all months for the year calendar
   */
  getAllMonths(): number[] {
    return Array(12)
      .fill(0)
      .map((_, i) => i + 1);
  }

  /**
   * Gets the first day of the month (0 = Monday, 6 = Sunday)
   *
   * @param month The month (1-12)
   * @returns The day of the week for the first day of the month (0-6, Monday-based)
   */
  getFirstDayOfMonthForYearView(month: number): number {
    return DateUtils.getFirstDayOfMonth(month, this.year);
  }

  /**
   * Gets the number of days in a month
   *
   * @param month The month (1-12)
   * @returns The number of days in the month
   */
  getDaysInMonthForYearView(month: number): number {
    return DateUtils.getDaysInMonth(month, this.year);
  }

  /**
   * Gets an array of empty cells for a specific month
   *
   * @param month The month (1-12)
   * @returns Array of empty cells
   */
  getEmptyCellsForMonth(month: number): number[] {
    const firstDay = this.getFirstDayOfMonthForYearView(month);
    return Array(firstDay)
      .fill(0)
      .map((_, i) => i);
  }

  /**
   * Gets an array of days for a specific month
   *
   * @param month The month (1-12)
   * @returns Array of days
   */
  getDaysArrayForMonth(month: number): number[] {
    const daysInMonth = this.getDaysInMonthForYearView(month);
    return Array(daysInMonth)
      .fill(0)
      .map((_, i) => i + 1);
  }

  /**
   * Checks if a specific day in a month is a recommended holiday
   *
   * @param day The day of the month
   * @param month The month (1-12)
   * @returns True if the day is a recommended holiday
   */
  isRecommendedHoliday(day: number, month: number): boolean {
    if (!this.calendarDays || this.calendarDays.length === 0) {
      return false;
    }

    // Format the date to match the display format in calendarDays
    const date = new Date(this.year, month - 1, day);
    const displayDate = date.toLocaleDateString();

    // Find the day in calendarDays
    const calendarDay = this.calendarDays.find(
      (d) => d.displayDate === displayDate
    );
    return calendarDay ? calendarDay.isRecommendedHoliday : false;
  }

  /**
   * Checks if a specific day in a month is a public holiday
   *
   * @param day The day of the month
   * @param month The month (1-12)
   * @returns True if the day is a public holiday
   */
  isPublicHoliday(day: number, month: number): boolean {
    if (!this.publicHolidays || this.publicHolidays.length === 0) {
      return false;
    }

    // Format the date to ISO format (YYYY-MM-DD) without timezone issues
    const isoDate = `${this.year}-${String(month).padStart(2, '0')}-${String(
      day
    ).padStart(2, '0')}`;

    // Check if the date is in the public holidays list
    return this.publicHolidays.some((holiday) => holiday.date === isoDate);
  }

  /**
   * Checks if a specific day in a month is a free day (weekend or holiday)
   *
   * @param day The day of the month
   * @param month The month (1-12)
   * @returns True if the day is a free day
   */
  isFreeDay(day: number, month: number): boolean {
    // Check if it's a weekend or a public holiday
    if (
      this.isWeekendForYearView(day, month) ||
      this.isPublicHoliday(day, month)
    ) {
      return true;
    }

    if (!this.calendarDays || this.calendarDays.length === 0) {
      return false;
    }

    // Format the date to match the display format in calendarDays
    const date = new Date(this.year, month - 1, day);
    const displayDate = date.toLocaleDateString();

    // Find the day in calendarDays
    const calendarDay = this.calendarDays.find(
      (d) => d.displayDate === displayDate
    );
    return calendarDay ? calendarDay.isFreeDay : false;
  }

  /**
   * Checks if a specific day in a month is a weekend
   *
   * @param day The day of the month
   * @param month The month (1-12)
   * @returns True if the day is a weekend
   */
  isWeekendForYearView(day: number, month: number): boolean {
    const date = new Date(this.year, month - 1, day);
    const dayOfWeek = date.getDay();

    // If Saturday is a workday, don't consider it a weekend
    if (dayOfWeek === 6 && this.saturdayWorkday) {
      return false;
    }

    // Sunday (0) or Saturday (6)
    return dayOfWeek === 0 || dayOfWeek === 6;
  }

  /**
   * Gets the month name for a specific month
   *
   * @param month The month (1-12)
   * @returns The month name
   */
  getMonthNameForYearView(month: number): string {
    return CALENDAR_CONSTANTS.MONTHS[month - 1];
  }

  /**
   * Gets the appropriate icon for a month
   *
   * @param month The month (1-12)
   * @returns The Bootstrap icon class for the month
   */
  getMonthIcon(month: number): string {
    // Map each month to a thematic icon
    const monthIcons = [
      'bi bi-snow', // January
      'bi bi-heart', // February
      'bi bi-flower1', // March
      'bi bi-cloud-rain', // April
      'bi bi-flower3', // May
      'bi bi-sun', // June
      'bi bi-brightness-high', // July
      'bi bi-umbrella', // August
      'bi bi-tree', // September
      'bi bi-emoji-smile', // October (pumpkin face)
      'bi bi-moon-stars', // November
      'bi bi-gift', // December
    ];

    return monthIcons[month - 1];
  }

  /**
   * Lifecycle hook: after view checked
   * Used to draw vacation flow lines after the view has been initialized
   */
  ngAfterViewChecked(): void {
    if (this.dataLoaded && this.calendarGrids) {
      this.drawVacationFlowLines();
    }
  }

  /**
   * Draws flow lines connecting vacation days and free days
   */
  drawVacationFlowLines(): void {
    // Process each month's calendar grid
    this.calendarGrids.forEach((gridRef: ElementRef) => {
      const gridElement = gridRef.nativeElement;

      // Remove any existing flow lines
      const existingLines = gridElement.querySelectorAll('.vacation-flow-line');
      existingLines.forEach((line: HTMLElement) => line.remove());

      // Get all vacation and free day cells
      const specialDays = Array.from(
        gridElement.querySelectorAll(
          '.day-cell.vacation, .day-cell.free-day, .day-cell.weekend'
        )
      );
      if (specialDays.length === 0) return;

      // Group consecutive days
      const groups = this.groupConsecutiveDays(specialDays as HTMLElement[]);

      // Create flow lines for each group
      groups.forEach((group) => {
        if (group.length < 2) return; // Need at least 2 days to draw a line

        this.createFlowLine(gridElement, group);
      });
    });
  }

  /**
   * Groups consecutive day cells
   *
   * @param dayCells Array of day cell elements
   * @returns Array of grouped consecutive day cells
   */
  private groupConsecutiveDays(dayCells: HTMLElement[]): HTMLElement[][] {
    // Sort cells by day and month
    const sortedCells = [...dayCells].sort((a, b) => {
      const aMonth = parseInt(a.getAttribute('data-month') || '0', 10);
      const bMonth = parseInt(b.getAttribute('data-month') || '0', 10);
      if (aMonth !== bMonth) return aMonth - bMonth;

      const aDay = parseInt(a.getAttribute('data-day') || '0', 10);
      const bDay = parseInt(b.getAttribute('data-day') || '0', 10);
      return aDay - bDay;
    });

    const groups: HTMLElement[][] = [];
    let currentGroup: HTMLElement[] = [];

    sortedCells.forEach((cell, index) => {
      if (index === 0) {
        currentGroup.push(cell);
        return;
      }

      const prevCell = sortedCells[index - 1];
      const prevDay = parseInt(prevCell.getAttribute('data-day') || '0', 10);
      const prevMonth = parseInt(
        prevCell.getAttribute('data-month') || '0',
        10
      );

      const currentDay = parseInt(cell.getAttribute('data-day') || '0', 10);
      const currentMonth = parseInt(cell.getAttribute('data-month') || '0', 10);

      // Check if days are consecutive (either same day+1 or first day of next month)
      const isConsecutive =
        (currentMonth === prevMonth && currentDay === prevDay + 1) ||
        (currentMonth === prevMonth + 1 &&
          currentDay === 1 &&
          prevDay === this.getDaysInMonthForYearView(prevMonth));

      if (isConsecutive) {
        currentGroup.push(cell);
      } else {
        if (currentGroup.length > 0) {
          groups.push([...currentGroup]);
        }
        currentGroup = [cell];
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Creates a flow line connecting a group of day cells
   *
   * @param gridElement The calendar grid element
   * @param group Array of day cells to connect
   */
  private createFlowLine(gridElement: HTMLElement, group: HTMLElement[]): void {
    if (group.length < 2) return;

    // Get positions of first and last cells
    const firstCell = group[0];
    const lastCell = group[group.length - 1];

    // Calculate relative positions
    const startX = firstCell.offsetLeft + firstCell.offsetWidth / 2;
    const startY = firstCell.offsetTop + firstCell.offsetHeight / 2;
    const endX = lastCell.offsetLeft + lastCell.offsetWidth / 2;
    const endY = lastCell.offsetTop + lastCell.offsetHeight / 2;

    // Calculate line dimensions
    const lineLength = Math.sqrt(
      Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
    );
    const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

    // Create line element
    const line = document.createElement('div');
    line.className = 'vacation-flow-line';
    line.style.width = `${lineLength}px`;
    line.style.height = '8px';
    line.style.position = 'absolute';
    line.style.top = `${startY}px`;
    line.style.left = `${startX}px`;
    line.style.transformOrigin = '0 50%';
    line.style.transform = `rotate(${angle}deg)`;
    line.style.zIndex = '0';

    // Add line to grid
    gridElement.appendChild(line);
  }
}
