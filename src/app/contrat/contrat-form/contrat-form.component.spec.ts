import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ContratFormComponent } from './contrat-form.component';
import { TranslationService } from '../../services/translation.service';
import { ToastService } from '../../services/toast.service';

/**
 * Phase 12.9 Stage B2: localization regression coverage for the contract admin form.
 * Uses the REAL TranslationService (provideHttpClient/provideHttpClientTesting/
 * provideRouter are enough to construct it safely -- same pattern proven in Stage
 * B1-I) so language-switching and key lookups are exercised for real, not mocked.
 * HttpTestingController intercepts any request these components fire during
 * ngOnInit (auth.getMySignature(), the route-driven load) so nothing reaches a
 * real backend; those requests are simply left unanswered, which is harmless for
 * the assertions here (none depend on data actually loading).
 */
describe('ContratFormComponent — i18n', () => {
  let fixture: ComponentFixture<ContratFormComponent>;
  let component: ContratFormComponent;
  let ts: TranslationService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ContratFormComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ContratFormComponent);
    component = fixture.componentInstance;
    ts = TestBed.inject(TranslationService);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    // No httpMock.verify() here -- ngOnInit's auth.getMySignature() call is
    // intentionally left pending (harmless; no assertion here depends on it).
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders French labels by default-equivalent and English/Arabic after switching', () => {
    ts.setLanguage('fr', false);
    expect(component.t('newContract')).toBe('Nouveau contrat');
    expect(component.t('contractInfo')).toBe('Informations du contrat');

    ts.setLanguage('en', false);
    expect(component.t('newContract')).toBe('New Contract');
    expect(component.t('contractInfo')).toBe('Contract Information');

    ts.setLanguage('ar', false);
    expect(component.t('newContract')).toBe('عقد جديد');
    expect(component.t('contractInfo')).toBe('معلومات العقد');
  });

  it('switches the template heading text when the language changes', () => {
    ts.setLanguage('fr', false);
    fixture.detectChanges();
    let h2 = fixture.nativeElement.querySelector('h2') as HTMLElement;
    expect(h2.textContent).toContain('Nouveau contrat');

    ts.setLanguage('en', false);
    fixture.detectChanges();
    h2 = fixture.nativeElement.querySelector('h2') as HTMLElement;
    expect(h2.textContent).toContain('New Contract');
  });

  it('every equipment checkbox label resolves to real text in all 3 languages (no raw key leaks through)', () => {
    for (const lang of ['en', 'fr', 'ar'] as const) {
      ts.setLanguage(lang, false);
      for (const item of component.equipementItems) {
        const label = component.t(item.labelKey);
        expect(label).not.toBe(item.labelKey); // would equal the raw key if the translation were missing
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });

  it('preserves form field values across a language switch', () => {
    component.clientNom = 'Karim Benali';
    component.lieuLivraison = 'Casablanca';
    ts.setLanguage('en', false);
    fixture.detectChanges();
    expect(component.clientNom).toBe('Karim Benali');
    expect(component.lieuLivraison).toBe('Casablanca');
    ts.setLanguage('ar', false);
    fixture.detectChanges();
    expect(component.clientNom).toBe('Karim Benali');
    expect(component.lieuLivraison).toBe('Casablanca');
  });

  it('save() shows a translated error and does not submit when reservationId is missing', () => {
    const toast = TestBed.inject(ToastService);
    const showSpy = jasmine.createSpy('show');
    toast.show = showSpy;
    component.reservationId = null;

    ts.setLanguage('en', false);
    component.save();

    expect(showSpy).toHaveBeenCalledWith('Missing reservation', 'error');
    expect(component.saving).toBe(false);
  });

  it('save() shows a translated, interpolated mileage warning without submitting', () => {
    const toast = TestBed.inject(ToastService);
    const showSpy = jasmine.createSpy('show');
    toast.show = showSpy;
    component.reservationId = 42;
    component.vehiculeKilometrageActuel = 50000;
    component.kilometrageDepart = 40000;

    ts.setLanguage('fr', false);
    component.save();

    expect(showSpy).toHaveBeenCalledWith(
      'Le kilométrage départ (40000) est inférieur au kilométrage actuel du véhicule (50000). Vérifiez la valeur saisie.',
      'error'
    );
    expect(component.saving).toBe(false);
  });

  it('submission payload field names are unaffected by the active UI language', () => {
    component.reservationId = 7;
    component.vehiculeKilometrageActuel = null;
    component.cautionMontant = 500;
    component.franchise = 1000;
    component.hasSecondDriver = true;
    component.secondNom = 'Youssef';

    for (const lang of ['fr', 'en', 'ar'] as const) {
      ts.setLanguage(lang, false);
      (component as any).contratService = {
        createContrat: (payload: any) => {
          expect(payload.reservationId).toBe(7);
          expect(payload.cautionMontant).toBe(500);
          expect(payload.franchise).toBe(1000);
          expect(payload.deuxiemeChauffeur.nom).toBe('Youssef');
          return { subscribe: (_: any) => {} };
        },
        updateContrat: () => ({ subscribe: (_: any) => {} }),
      };
      component.save();
    }
  });
});
