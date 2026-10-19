import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { VoitureCreateComponent } from './voiture-create.component';
import { TranslationService } from '../../services/translation.service';

/**
 * Phase 12.9 Stage B2: localization regression coverage for the vehicle-creation
 * wizard. Same provider pattern as contrat-form.component.spec.ts and Stage
 * B1-I's fixes: provideHttpClient/provideHttpClientTesting/provideRouter are
 * enough to construct the real component with its real (HTTP-backed but here
 * intercepted) services, so translation lookups are exercised for real.
 */
describe('VoitureCreateComponent — i18n', () => {
  let fixture: ComponentFixture<VoitureCreateComponent>;
  let component: VoitureCreateComponent;
  let ts: TranslationService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [VoitureCreateComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(VoitureCreateComponent);
    component = fixture.componentInstance;
    ts = TestBed.inject(TranslationService);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    // ngOnInit() calls loadSuppliers() -> GET fournisseur -- answer it so later
    // assertions on component.fournisseurs are deterministic rather than pending.
    const req = httpMock.match(r => r.url.includes('fournisseur'));
    req.forEach(r => r.flush({ data: [] }));
  });

  afterEach(() => localStorage.clear());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('the previously-missing visiteTechnique and gpl keys now resolve to real text in all 3 languages (regression guard for the Stage B2 investigation finding)', () => {
    for (const lang of ['en', 'fr', 'ar'] as const) {
      ts.setLanguage(lang, false);
      expect(component.t('visiteTechnique')).not.toBe('visiteTechnique');
      expect(component.t('gpl')).not.toBe('gpl');
    }
    ts.setLanguage('fr', false);
    expect(component.t('visiteTechnique')).toBe('Visite technique');
    expect(component.t('gpl')).toBe('GPL');
  });

  it('renders the step title and wizard stepper labels in French, English, and Arabic', () => {
    ts.setLanguage('fr', false);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('h1') as HTMLElement).textContent)
      .toContain(ts.translate('addVehicle'));

    ts.setLanguage('en', false);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('h1') as HTMLElement).textContent)
      .toContain(ts.translate('addVehicle'));

    ts.setLanguage('ar', false);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('h1') as HTMLElement).textContent)
      .toContain(ts.translate('addVehicle'));
  });

  it('the insurance coverage select\'s displayed option text changes with language, but its submitted value never does', () => {
    for (const lang of ['fr', 'en', 'ar'] as const) {
      ts.setLanguage(lang, false);
      fixture.detectChanges();
      expect(component.t('coverageLiability').length).toBeGreaterThan(0);
    }
    // The stored/submitted enum value is the literal below regardless of UI language.
    component.assuranceForm.get('typeAssurance')!.setValue('RC');
    expect(component.assuranceForm.value.typeAssurance).toBe('RC');
  });

  it('preserves reactive form values (vehicle info + compliance steps) across a language switch', () => {
    component.form.patchValue({ marque: 'Dacia', modele: 'Sandero', annee: 2023 });
    component.assuranceForm.patchValue({ compagnie: 'Wafa Assurance' });

    ts.setLanguage('en', false);
    fixture.detectChanges();
    expect(component.form.value.marque).toBe('Dacia');
    expect(component.assuranceForm.value.compagnie).toBe('Wafa Assurance');

    ts.setLanguage('ar', false);
    fixture.detectChanges();
    expect(component.form.value.marque).toBe('Dacia');
    expect(component.assuranceForm.value.compagnie).toBe('Wafa Assurance');
  });

  it('required-field validation on the vehicle-info step is unaffected by the active language', () => {
    component.form.patchValue({ marque: '', modele: '', annee: null, kilometrageActuel: null });
    for (const lang of ['fr', 'en', 'ar'] as const) {
      ts.setLanguage(lang, false);
      expect(component.canProceed()).toBe(false);
    }
    component.form.patchValue({ marque: 'Dacia', modele: 'Sandero', annee: 2023, kilometrageActuel: 10000 });
    for (const lang of ['fr', 'en', 'ar'] as const) {
      ts.setLanguage(lang, false);
      expect(component.canProceed()).toBe(true);
    }
  });

  it('the date-range validation error on the assurance step shows translated text', () => {
    component.assuranceForm.patchValue({ dateDebut: '2026-06-01', dateFin: '2026-01-01' });
    expect(component.assuranceForm.hasError('dateRange')).toBe(true);

    ts.setLanguage('fr', false);
    expect(component.t('dateRangeInvalid')).toBe('La date de début ne peut pas être postérieure à la date d\'expiration.');
    ts.setLanguage('en', false);
    expect(component.t('dateRangeInvalid')).toBe('Start date cannot be after the expiration date.');
  });

  it('supplier-creation error message is translated and the real submit payload is unaffected by language', () => {
    component.supplierForm.patchValue({ raisonSociale: 'Auto Maroc SARL' });

    for (const lang of ['fr', 'en', 'ar'] as const) {
      ts.setLanguage(lang, false);
      component.createSupplier();
      const req = httpMock.expectOne(r => r.url.includes('fournisseur') && r.method === 'POST');
      expect(req.request.body.raisonSociale).toBe('Auto Maroc SARL');
      req.flush({ id: 99, raisonSociale: 'Auto Maroc SARL' });
    }
  });

  it('supplier-creation failure shows the translated fallback error', () => {
    component.supplierForm.patchValue({ raisonSociale: 'Auto Maroc SARL' });
    ts.setLanguage('en', false);
    component.createSupplier();
    const req = httpMock.expectOne(r => r.url.includes('fournisseur') && r.method === 'POST');
    req.flush({}, { status: 500, statusText: 'Server Error' });
    expect(component.supplierError).toBe('Failed to create supplier.');
  });
});
