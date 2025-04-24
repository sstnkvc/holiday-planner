import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom, map } from 'rxjs';
import { PublicHoliday } from '../models/holiday-response';

/**
 * API response interface for OpenHolidaysAPI
 */
interface OpenHolidayApiResponse {
  /** Holiday name in multiple languages */
  name: { text: string }[];
  /** Start date of the holiday */
  startDate: string;
  /** End date of the holiday */
  endDate: string;
  /** Type of the holiday */
  type: string;
}

/**
 * Service for fetching public holidays from OpenHolidaysAPI
 */
@Injectable({
  providedIn: 'root',
})
export class HolidayService {
  private readonly apiUrl = 'https://openholidaysapi.org/PublicHolidays';

  constructor(private http: HttpClient) {}

  /**
   * Fetches public holidays for a given country and date range
   *
   * @param countryIsoCode The ISO code of the country (default: 'AT' for Austria)
   * @param year The year to fetch holidays for (default: current year)
   * @returns Promise with public holidays array
   */
  async getPublicHolidays(
    countryIsoCode: string = 'AT',
    year: number = new Date().getFullYear()
  ): Promise<PublicHoliday[]> {
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;

    return firstValueFrom(this.fetchHolidays(countryIsoCode, from, to));
  }

  /**
   * Fetches holidays from the API and transforms the response
   *
   * @param countryIsoCode The ISO code of the country
   * @param from Start date in ISO format
   * @param to End date in ISO format
   * @returns Observable of transformed holiday data
   */
  private fetchHolidays(
    countryIsoCode: string,
    from: string,
    to: string
  ): Observable<PublicHoliday[]> {
    const params = new HttpParams()
      .set('countryIsoCode', countryIsoCode)
      .set('validFrom', from)
      .set('validTo', to);

    return this.http
      .get<OpenHolidayApiResponse[]>(this.apiUrl, { params })
      .pipe(map((response) => this.transformApiResponse(response)));
  }

  /**
   * Transforms the API response to our internal model
   *
   * @param response The raw API response
   * @returns Transformed PublicHoliday array
   */
  private transformApiResponse(
    response: OpenHolidayApiResponse[]
  ): PublicHoliday[] {
    return response.map((holiday) => ({
      name: holiday.name[0].text,
      date: holiday.startDate,
    }));
  }
}
