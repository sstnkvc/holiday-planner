import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HolidayPlannerComponent } from './holiday-planner/holiday-planner.component';
import { MatTableModule } from '@angular/material/table';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import {
  HttpClient,
  HttpClientModule,
  HttpHandler,
} from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [AppComponent, HolidayPlannerComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MatTableModule,
    NgbModule,
    HttpClientModule,
    FormsModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
