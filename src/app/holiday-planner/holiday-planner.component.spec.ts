import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HolidayPlannerComponent } from './holiday-planner.component';

describe('HolidayPlannerComponent', () => {
  let component: HolidayPlannerComponent;
  let fixture: ComponentFixture<HolidayPlannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HolidayPlannerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HolidayPlannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
