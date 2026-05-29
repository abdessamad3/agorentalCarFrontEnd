import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BureauEditComponent } from './bureau-edit.component';

describe('BureauEditComponent', () => {
  let component: BureauEditComponent;
  let fixture: ComponentFixture<BureauEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BureauEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BureauEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
