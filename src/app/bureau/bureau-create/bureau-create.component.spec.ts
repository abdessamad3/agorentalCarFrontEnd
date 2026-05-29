import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BureauCreateComponent } from './bureau-create.component';

describe('BureauCreateComponent', () => {
  let component: BureauCreateComponent;
  let fixture: ComponentFixture<BureauCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BureauCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BureauCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
