import { Component, OnInit } from '@angular/core';
import { IDay } from './models/day';
import { HolidayService } from './service/holiday.service';
import { IHolidayResponse } from './models/holiday-response';

interface yyy {
  indexBeginOfFalse: number | undefined;
  indexEndOfFalse: number | undefined;
  dateBeginOfFalse: string | undefined;
  dateEndOfFalse: string | undefined;
  streak: number | undefined;
}

interface sparenSie {
  dateStreak: string[];
  streak: number;
  holidaysNeeded: number;
  holidayDatesNeeded: string[];
}

@Component({
  selector: 'app-holiday-planner',
  templateUrl: './holiday-planner.component.html',
  styleUrls: ['./holiday-planner.component.css'],
})
export class HolidayPlannerComponent implements OnInit {
  constructor(private holidayService: HolidayService) {}

  calendarDays: IDay[] = [];
  holidays: IHolidayResponse[] = [];

  year = 2023;
  month = 1;
  day = 1;
  availableHolidays = 25;
  fridaysFree = false;

  recListString: string[] = [];
  sparenSieResults: sparenSie[] = [];
  weekEndArr: string[] = ['Samstag', 'Sonntag'];

  showSuccessAlert = false;
  dataLoaded = false;

  async ngOnInit() {
    this.holidays = await this.holidayService.getHolidays('AT');
    // this.createCalenderDaysAndAddHolidayRecommendationsToTable();
  }

  hideSuccessAlert() {
    this.showSuccessAlert = false;
  }

  createCalenderDaysAndAddHolidayRecommendationsToTable() {
    this.calendarDays = this.createCalendarYear2023();
    const rec = this.getHolidayRecommendations();
    let availableCopy = this.availableHolidays;

    const list: string[] = [];

    rec.forEach((recs) => {
      if (availableCopy > 0) {
        let beginIndex = recs.indexBeginOfFalse as number;
        let endIndex = recs.indexEndOfFalse as number;

        while (beginIndex <= endIndex && availableCopy !== 0) {
          const dateToBePushed = this.calendarDays[beginIndex].prettyDate;
          list.push(dateToBePushed);
          beginIndex++;
          availableCopy--;
        }
      }
    });

    this.recListString = list;
    this.recListString.forEach((x) => x.concat('\n'));
    list.forEach((entry) => {
      const def = this.calendarDays.find((day) => day.prettyDate === entry);
      if (def != null) {
        def.holidayRecommendation = true;
      }
    });

    this.createHolidayInfos(list);
    this.dataLoaded = true;
    this.showSuccessAlert = true;
    return list;
  }

  checkboxChange() {
    this.fridaysFree = !this.fridaysFree;
    if (this.fridaysFree) {
      this.weekEndArr.push('Freitag');
    } else {
      this.weekEndArr = this.weekEndArr.filter((entry) => entry !== 'Freitag');
    }
    this.hideSuccessAlert();
  }

  createHolidayInfos(listWhereHolidayShouldBeUsed: string[]): sparenSie[] {
    const allGesamtDates: string[] = [];
    const sparenSieArray: sparenSie[] = [];

    listWhereHolidayShouldBeUsed.forEach(
      (holidayDateThatIsBeingRecommended) => {
        if (allGesamtDates.includes(holidayDateThatIsBeingRecommended)) {
          return;
        }

        const indexOfHolidayThatIsBeingRecommended =
          this.calendarDays.findIndex(
            (day) => day.prettyDate === holidayDateThatIsBeingRecommended
          );

        let backwardIndex = indexOfHolidayThatIsBeingRecommended - 1;
        let backwardCounter = 0;
        let backwardDates: string[] = [];

        while (
          this.calendarDays[backwardIndex] !== undefined &&
          (this.calendarDays[backwardIndex].isFreeDay === true ||
            this.calendarDays[backwardIndex].holidayRecommendation === true)
        ) {
          backwardDates.push(this.calendarDays[backwardIndex].prettyDate);
          backwardCounter++;
          backwardIndex--;
        }

        let forwardIndex = indexOfHolidayThatIsBeingRecommended + 1;
        let forwardCounter = 0;
        let forwardDates: string[] = [];

        while (
          this.calendarDays[forwardIndex] !== undefined &&
          (this.calendarDays[forwardIndex].isFreeDay === true ||
            this.calendarDays[forwardIndex].holidayRecommendation === true)
        ) {
          forwardDates.push(this.calendarDays[forwardIndex].prettyDate);

          forwardCounter++;
          forwardIndex++;
        }

        const gesamtDates = [
          ...backwardDates.reverse(),
          holidayDateThatIsBeingRecommended,
          ...forwardDates,
        ];

        let holidayCounter = 0;

        const holidaysDateNeeded: string[] = [];

        gesamtDates.forEach((date) => {
          const foundDay = this.calendarDays.find(
            (day) => day.prettyDate === date
          );
          if (foundDay?.holidayRecommendation === true) {
            holidayCounter++;
            holidaysDateNeeded.push(date);
          }
        });

        allGesamtDates.push(...gesamtDates);
        sparenSieArray.push({
          dateStreak: gesamtDates,
          streak: gesamtDates.length,
          holidaysNeeded: holidayCounter,
          holidayDatesNeeded: holidaysDateNeeded,
        });
      }
    );

    const orderedSparenArray = sparenSieArray.sort(function (a, b) {
      if (a.streak > b.streak) {
        return -1;
      }
      if (a.streak < b.streak) {
        return 1;
      }
      if (a.holidaysNeeded > b.holidaysNeeded) {
        return 1;
      }
      if (a.holidaysNeeded < b.holidaysNeeded) {
        return -1;
      }
      // a must be equal to b
      return 0;
    });

    this.sparenSieResults = orderedSparenArray;

    return orderedSparenArray;
  }

  getHolidayRecommendations(): yyy[] {
    const data = this.calendarDays.map((entry, index) => {
      return {
        date: entry.prettyDate,
        index: index,
        isFreeDay: entry.isFreeDay,
      };
    });

    const datesWithIndexes = data.map((result) => {
      return {
        index: result.index,
        date: result.date,
        isFreeDay: result.isFreeDay,
      };
    });

    let beginOccurenceOfFalse = undefined;
    let endOccurenceOfFalse = undefined;
    const objectListx: any[] = [];

    for (let index = 0; index < datesWithIndexes.length; index++) {
      const element = datesWithIndexes[index];
      if (element.isFreeDay === false) {
        if (beginOccurenceOfFalse !== undefined) {
          continue;
        }

        beginOccurenceOfFalse = index;
        continue;
      } else {
        if (beginOccurenceOfFalse === undefined) {
          continue;
        }

        endOccurenceOfFalse = index - 1;
        const object: yyy = {
          indexBeginOfFalse: beginOccurenceOfFalse,
          dateBeginOfFalse: datesWithIndexes[beginOccurenceOfFalse].date,
          dateEndOfFalse: datesWithIndexes[endOccurenceOfFalse].date,
          indexEndOfFalse: endOccurenceOfFalse,
          streak: endOccurenceOfFalse - beginOccurenceOfFalse + 1,
        };

        index = endOccurenceOfFalse + 1;
        beginOccurenceOfFalse = undefined;
        endOccurenceOfFalse = undefined;
        objectListx.push(object);
      }
    }

    const sortedObjList = objectListx.sort(
      (obj1, obj2) => obj1.streak - obj2.streak
    );

    return sortedObjList;
  }

  createCalendarYear2023(): IDay[] {
    const weekday = [
      'Sonntag',
      'Montag',
      'Dienstag',
      'Mittwoch',
      'Donnerstag',
      'Freitag',
      'Samstag',
    ];

    // Erstelle ein leeres Array, um die Daten zu speichern
    let calendar: IDay[] = [];

    // Erstelle ein neues Date-Objekt für den 1. Januar 2023
    let currentDate = new Date(this.year, this.month - 1, this.day);

    // Iteriere über jeden Tag im Jahr
    while (currentDate.getFullYear() === 2023) {
      // Erstelle ein neues Objekt und speichere die Daten
      let dayObject = {
        prettyDate: currentDate.toLocaleDateString(),
        isoDate: this.formatDate(currentDate.toLocaleDateString()),
        weekDay: weekday[currentDate.getDay()],
        isFreeDay: false,
        holidayRecommendation: false,
      };
      // Füge das Objekt dem Array hinzu
      calendar.push(dayObject);

      // Erhöhe das Datum um einen Tag
      currentDate.setDate(currentDate.getDate() + 1);
    }

    calendar.forEach((entry) => {
      if (this.weekEndArr.includes(entry.weekDay)) {
        entry.isFreeDay = true;
      }
    });

    const holidaysDates = this.holidays.map((holiday) => holiday.date);

    holidaysDates.forEach((holidayDate) => {
      calendar.forEach((calEntry) => {
        if (calEntry.isoDate === holidayDate) {
          calEntry.isFreeDay = true;
        }
      });
    });

    // Gib das Array zurück
    return calendar;
  }

  formatDate(dateString: string) {
    var parts = dateString.split('.');
    const day = parts[0];
    const month = parts[1];
    const year = parts[2];

    return year + '-' + ('0' + month).slice(-2) + '-' + ('0' + day).slice(-2);
  }
}
