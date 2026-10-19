import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { VoitureDetailComponent } from './voiture-detail.component';

describe('VoitureDetailComponent', () => {
  let component: VoitureDetailComponent;
  let fixture: ComponentFixture<VoitureDetailComponent>;

  beforeEach(async () => {
    // VoitureService/CrudService/TranslationService/AuthService/EventBusService need
    // HttpClient; the component injects Router and ActivatedRoute. The template's many
    // tab components (app-lifecycle-panel, app-readiness-panel, app-paginator, etc.)
    // are all gated behind *ngIf="isAdmin"/activeTab/data-dependent conditions that are
    // false by default with no logged-in user, so only app-overview-tab (activeTab's
    // default) actually renders -- its own deps (TranslationService/CrudService/
    // AuthService) are already covered above.
    await TestBed.configureTestingModule({
      imports: [VoitureDetailComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
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
