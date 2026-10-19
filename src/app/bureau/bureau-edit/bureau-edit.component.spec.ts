import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { BureauEditComponent } from './bureau-edit.component';

describe('BureauEditComponent', () => {
  let component: BureauEditComponent;
  let fixture: ComponentFixture<BureauEditComponent>;

  beforeEach(async () => {
    // BureauService and the component's own injected HttpClient both need it; the
    // component also injects Router and ActivatedRoute.
    await TestBed.configureTestingModule({
      imports: [BureauEditComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
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
