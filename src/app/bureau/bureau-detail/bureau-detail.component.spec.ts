import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { BureauDetailComponent } from './bureau-detail.component';

describe('BureauDetailComponent', () => {
  let component: BureauDetailComponent;
  let fixture: ComponentFixture<BureauDetailComponent>;

  beforeEach(async () => {
    // BureauService needs HttpClient; the component also injects Router and
    // ActivatedRoute (both supplied by provideRouter([])).
    await TestBed.configureTestingModule({
      imports: [BureauDetailComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
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
