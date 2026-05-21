import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VoitureCreateComponent } from './voiture-create.component';

describe('VoitureCreateComponent', () => {
  let component: VoitureCreateComponent;
  let fixture: ComponentFixture<VoitureCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VoitureCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VoitureCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
