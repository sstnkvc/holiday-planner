import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { IHolidayResponse } from '../models/holiday-response';

@Injectable({
  providedIn: 'root',
})
export class HolidayService {
  constructor(private http: HttpClient) {}

  async getHolidays(
    countryIsoCode: string = 'AT',
    from: string = '2023-01-01',
    to: string = '2023-12-31'
  ): Promise<IHolidayResponse[]> {
    let params = new HttpParams();
    params = params.append('countryIsoCode', countryIsoCode);
    params = params.append('validFrom', from);
    params = params.append('validTo', to);

    const responseArray: any[] = await this.http
      .get<any>('https://openholidaysapi.org/PublicHolidays', {
        params: params,
      })
      .toPromise();

    return responseArray.map((obj) => {
      return {
        name: obj.name[0].text,
        date: obj.startDate,
      };
    });
  }
}
