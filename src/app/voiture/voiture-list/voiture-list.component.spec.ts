import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { VoitureListComponent } from './voiture-list.component';

describe('VoitureListComponent', () => {
  let component: VoitureListComponent;
  let fixture: ComponentFixture<VoitureListComponent>;

  beforeEach(async () => {
    // VoitureService/CrudService/TranslationService/AuthService need HttpClient; the
    // component injects Router and ActivatedRoute. Template child components
    // (app-compliance-badge, app-date-range-picker, app-upload-btn) have no
    // dependencies of their own beyond TranslationService, already covered.
    await TestBed.configureTestingModule({
      imports: [VoitureListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(VoitureListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
