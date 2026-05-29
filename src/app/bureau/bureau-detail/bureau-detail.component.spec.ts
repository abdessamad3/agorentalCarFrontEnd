import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BureauDetailComponent } from './bureau-detail.component';

describe('BureauDetailComponent', () => {
  let component: BureauDetailComponent;
  let fixture: ComponentFixture<BureauDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BureauDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BureauDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
