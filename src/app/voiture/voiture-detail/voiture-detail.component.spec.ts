import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VoitureDetailComponent } from './voiture-detail.component';

describe('VoitureDetailComponent', () => {
  let component: VoitureDetailComponent;
  let fixture: ComponentFixture<VoitureDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VoitureDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VoitureDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
