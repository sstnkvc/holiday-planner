import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HolidayPlannerComponent } from './holiday-planner/holiday-planner.component';

const routes: Routes = [
  { path: 'planner', component: HolidayPlannerComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
