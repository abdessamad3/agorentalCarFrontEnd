import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VoitureDashboardComponent } from './voiture-dashboard.component';

describe('VoitureDashboardComponent', () => {
  let component: VoitureDashboardComponent;
  let fixture: ComponentFixture<VoitureDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VoitureDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VoitureDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
