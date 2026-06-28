import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { VoitureService } from '../../services/voiture.service';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { catchError, switchMap } from 'rxjs/operators';
import { of, Observable } from 'rxjs';

@Component({
  selector: 'app-voiture-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './voiture-create.component.html',
  styleUrls: ['./voiture-create.component.css']
})
export class VoitureCreateComponent implements OnInit {
  form: FormGroup;
  isSubmitting = false;
  dir = 'ltr';
  currentStep = 0;

  selectedFiles: File[] = [];
  imagePreviews: { url: SafeUrl; name: string; size: string; isMain: boolean }[] = [];
  isDragging = false;

  assuranceFile: File | null = null;
  vignetteFile:  File | null = null;
  fournisseurs: any[] = [];

  // ── Supplier modal state ──────────────────────────────────────────────────
  supplierForm: FormGroup;
  showSupplierModal  = false;
  isCreatingSupplier = false;
  supplierError      = '';

  readonly STEPS = [
    { key: 'vehicleInfo', labelKey: 'vehicleInfo'     },
    { key: 'purchase',    labelKey: 'purchaseDetails' },
    { key: 'assurance',   labelKey: 'assurance'       },
    { key: 'vignette',    labelKey: 'vignette'        },
    { key: 'inspection',  labelKey: 'visiteTechnique' },
    { key: 'pricing',     labelKey: 'financialInfo'   },
    { key: 'documents',   labelKey: 'vehicleImages'   },
    { key: 'accessories', labelKey: 'accessories'     },
    { key: 'review',      labelKey: 'review'          },
  ];

  // Compliance step forms
  assuranceForm!: FormGroup;
  vignetteForm!:  FormGroup;
  inspectionForm!: FormGroup;

  // Compliance step state
  complianceSkipped: Record<string, boolean> = {};

  // Snapshots — saved when navigating away from each compliance step because
  // Angular removes FormControlName controls from the group when *ngIf hides them.
  assuranceSnapshot:  any = {};
  vignetteSnapshot:   any = {};
  inspectionSnapshot: any = {};
  complianceError: string | null = null;

  readonly FUEL_OPTIONS  = ['Essence', 'Diesel', 'Hybride', 'Electrique', 'GPL'];
  readonly CAT_OPTIONS   = ['Citadine', 'Berline', 'SUV', '4x4', 'Monospace', 'Cabriolet', 'Utilitaire', 'Coupé', 'Pick-up'];
  readonly currentYear   = new Date().getFullYear();

  creditCalc = { resteAFinancer: 0, dureeMois: 0, dernierMensualite: 0 };

  get isCreditType(): boolean {
    const t = this.form.get('typeFinancement')?.value;
    return t === 'credit' || t === 'leasing';
  }

  get needsInspection(): boolean {
    const annee = +(this.form.get('annee')?.value || new Date().getFullYear());
    return (new Date().getFullYear() - annee) >= 3;
  }

  get effectiveSteps() {
    return this.STEPS.filter(s => s.key !== 'inspection' || this.needsInspection);
  }

  get totalSteps(): number { return this.effectiveSteps.length; }

  get currentStepKey(): string { return this.effectiveSteps[this.currentStep]?.key ?? ''; }

  stepIndex(key: string): number { return this.effectiveSteps.findIndex(s => s.key === key); }

  constructor(
    private fb: FormBuilder,
    private voitureService: VoitureService,
    private crud: CrudService,
    private ts: TranslationService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {
    this.form = this.fb.group({
      // Step 0 — Vehicle Info
      marque:            ['', Validators.required],
      modele:            ['', Validators.required],
      version:           [''],
      annee:             [new Date().getFullYear(), [Validators.required, Validators.min(1990), Validators.max(2030)]],
      immatNum1:         [''],
      immatLetter:       [''],
      immatNum2:         [''],
      vin:               [''],
      typeCarburant:     ['Essence'],
      transmission:      ['Manuelle'],
      kilometrageActuel: [0, Validators.min(0)],

      // Step 1 — Purchase Details
      prixAchat:       [0, [Validators.required, Validators.min(0)]],
      dateAchat:       ['', Validators.required],
      fournisseurId:   [null],
      typeFinancement: ['comptant'],
      apport:          [0, Validators.min(0)],
      mensualite:      [0, Validators.min(0)],
      tauxInteret:     [0, Validators.min(0)],

      // Step 2 — Pricing
      prixJour:    ['', [Validators.required, Validators.min(0)]],
      caution:     [0, Validators.min(0)],

      // Step 4 — Accessories
      couleur:       [''],
      places:        [5, [Validators.min(1), Validators.max(20)]],
      portes:        [4, [Validators.min(2), Validators.max(6)]],
      puissanceCv:   [''],
      categorie:     [''],
      climatisation: [false],
    });

    this.supplierForm = this.fb.group({
      raisonSociale: ['', Validators.required],
      nom:           [''],
      telephone:     [''],
      email:         ['', Validators.email],
      adresse:       [''],
      ice:           [''],
    });

    this.assuranceForm = this.fb.group({
      compagnie:      [''],
      typeAssurance:  ['Tous Risques'],
      numeroContrat:  [''],
      montant:        [''],
      montantPaye:    [''],
      dateDebut:      ['', Validators.required],
      dateFin:        ['', Validators.required],
    });

    const currentYear = new Date().getFullYear();
    this.vignetteForm = this.fb.group({
      annee:       [currentYear],
      dateLimite:  [`${currentYear + 1}-01-31`],
      montant:     [''],
      montantPaye: [''],
    });

    this.inspectionForm = this.fb.group({
      dateReglages: [''],
      dateFin:      [''],
      montant:      [''],
    });
  }

  ngOnInit(): void {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.loadSuppliers();
    this.vignetteForm.get('annee')!.valueChanges.subscribe(annee => {
      const y = parseInt(annee, 10);
      if (!isNaN(y) && y > 2000) {
        this.vignetteForm.get('dateLimite')!.setValue(`${y + 1}-01-31`, { emitEvent: false });
      }
    });
    ['prixAchat', 'apport', 'mensualite', 'tauxInteret'].forEach(f =>
      this.form.get(f)?.valueChanges.subscribe(() => this.recalcCredit())
    );
  }

  recalcCredit(): void {
    const price    = +(this.form.get('prixAchat')?.value  ?? 0);
    const apport   = +(this.form.get('apport')?.value     ?? 0);
    const monthly  = +(this.form.get('mensualite')?.value ?? 0);
    const reste    = Math.max(0, price - apport);
    const duration = monthly > 0 ? Math.floor(reste / monthly) : 0;
    const last     = monthly > 0 ? +(reste - duration * monthly).toFixed(2) : 0;
    this.creditCalc = { resteAFinancer: reste, dureeMois: duration, dernierMensualite: last };
  }

  private loadSuppliers(): void {
    this.crud.getAll('fournisseur', { limit: 500 }).pipe(catchError(() => of([]))).subscribe(r => {
      this.fournisseurs = Array.isArray(r) ? r : (r as any)?.data ?? [];
    });
  }

  // ── Step navigation ───────────────────────────────────────────────────────

  canProceed(): boolean {
    switch (this.currentStepKey) {
      case 'vehicleInfo':
        return !!(this.form.get('marque')?.valid &&
                  this.form.get('modele')?.valid &&
                  this.form.get('annee')?.valid);
      case 'purchase':
        return !!(this.form.get('dateAchat')?.valid && this.form.get('prixAchat')?.valid);
      case 'assurance':
        return !!(this.assuranceForm.get('dateFin')?.valid && this.assuranceForm.get('dateDebut')?.valid);
      case 'pricing':
        return !!this.form.get('prixJour')?.valid;
      default:
        return true;
    }
  }

  next(): void {
    if (this.currentStep < this.totalSteps - 1 && this.canProceed()) {
      this.saveCurrentStepSnapshot();
      this.currentStep++;
    }
  }

  prev(): void {
    if (this.currentStep > 0) this.currentStep--;
  }

  goTo(step: number): void {
    if (step <= this.currentStep) this.currentStep = step;
  }

  skipComplianceStep(): void {
    // Clear snapshot so the review and submission both treat this step as empty
    switch (this.currentStepKey) {
      case 'assurance':  this.assuranceSnapshot  = {}; break;
      case 'vignette':   this.vignetteSnapshot   = {}; break;
      case 'inspection': this.inspectionSnapshot = {}; break;
    }
    this.complianceSkipped[this.currentStepKey] = true;
    if (this.currentStep < this.totalSteps - 1) this.currentStep++;
  }

  private saveCurrentStepSnapshot(): void {
    switch (this.currentStepKey) {
      case 'assurance':  this.assuranceSnapshot  = { ...this.assuranceForm.value };  break;
      case 'vignette':   this.vignetteSnapshot   = { ...this.vignetteForm.value };   break;
      case 'inspection': this.inspectionSnapshot = { ...this.inspectionForm.value }; break;
    }
  }

  fmtDateStr(d: string | null | undefined): string {
    if (!d) return '—';
    const parts = String(d).slice(0, 10).split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
  }

  // ── Supplier modal ────────────────────────────────────────────────────────

  openSupplierModal(): void {
    this.supplierForm.reset({ raisonSociale: '', nom: '', telephone: '', email: '', adresse: '', ice: '' });
    this.supplierError     = '';
    this.showSupplierModal = true;
  }

  closeSupplierModal(): void {
    this.showSupplierModal = false;
  }

  createSupplier(): void {
    if (this.supplierForm.invalid) {
      this.supplierForm.markAllAsTouched();
      return;
    }
    this.isCreatingSupplier = true;
    this.supplierError      = '';
    const payload: Record<string, any> = {};
    Object.entries(this.supplierForm.value).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') payload[k] = v;
    });
    this.crud.create('fournisseur', payload).subscribe({
      next: (res: any) => {
        this.isCreatingSupplier = false;
        this.fournisseurs = [...this.fournisseurs, res];
        this.form.patchValue({ fournisseurId: res.id });
        this.closeSupplierModal();
      },
      error: (err: any) => {
        this.isCreatingSupplier = false;
        this.supplierError = err?.error?.message || err?.error?.detail || err?.error?.['hydra:description'] || 'Failed to create supplier.';
      },
    });
  }

  // ── Image handling ────────────────────────────────────────────────────────

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(Array.from(input.files));
    input.value = '';
  }

  onAssuranceFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.assuranceFile = input.files[0];
    input.value = '';
  }

  onVignetteFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.vignetteFile = input.files[0];
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer?.files) this.addFiles(Array.from(event.dataTransfer.files));
  }

  onDragOver(event: DragEvent): void  { event.preventDefault(); this.isDragging = true; }
  onDragLeave(event: DragEvent): void { this.isDragging = false; }

  addFiles(files: File[]): void {
    files.filter(f => f.type.startsWith('image/')).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        this.imagePreviews.push({
          url: this.sanitizer.bypassSecurityTrustUrl(dataUrl),
          name: file.name,
          size: this.fmtSize(file.size),
          isMain: this.imagePreviews.length === 0,
        });
        this.selectedFiles.push(file);
      };
      reader.readAsDataURL(file);
    });
  }

  setMain(idx: number): void {
    this.imagePreviews.forEach((p, i) => p.isMain = i === idx);
  }

  removeImage(idx: number): void {
    const wasMain = this.imagePreviews[idx].isMain;
    this.imagePreviews.splice(idx, 1);
    this.selectedFiles.splice(idx, 1);
    if (wasMain && this.imagePreviews.length > 0) this.imagePreviews[0].isMain = true;
  }

  fmtSize(bytes: number): string {
    if (bytes < 1024)    return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  filterDigits(el: EventTarget | null): void {
    if (!el) return;
    (el as HTMLInputElement).value = (el as HTMLInputElement).value.replace(/\D/g, '');
  }

  filterLetter(el: EventTarget | null): void {
    if (!el) return;
    (el as HTMLInputElement).value = (el as HTMLInputElement).value.replace(/[^a-zA-Z]/g, '').toUpperCase();
  }

  // ── Review helpers ────────────────────────────────────────────────────────

  fournisseurName(id: any): string {
    const f = this.fournisseurs.find(x => x.id == id);
    return f ? (f.raisonSociale || f.nom || f.name || '-') : '-';
  }

  get plate(): string {
    const { immatNum1, immatLetter, immatNum2 } = this.form.value;
    return [immatNum1, (immatLetter || '').toUpperCase(), immatNum2].filter(Boolean).join('-') || '—';
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.form.get('marque')?.invalid || this.form.get('modele')?.invalid || this.form.get('annee')?.invalid) {
      this.currentStep = 0; return;
    }
    if (this.form.get('dateAchat')?.invalid || this.form.get('prixAchat')?.invalid) {
      this.currentStep = this.effectiveSteps.findIndex(s => s.key === 'purchase'); return;
    }
    if (this.form.get('prixJour')?.invalid) {
      this.currentStep = this.effectiveSteps.findIndex(s => s.key === 'pricing'); return;
    }

    this.isSubmitting = true;
    this.complianceError = null;
    const fd = new FormData();

    const { immatNum1, immatLetter, immatNum2, fournisseurId, typeFinancement, apport, mensualite, tauxInteret, ...rest } = this.form.value;
    const plateStr = [immatNum1, (immatLetter || '').toUpperCase(), immatNum2].filter(Boolean).join('-');
    if (plateStr) fd.append('immatriculation', plateStr);

    Object.entries(rest).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') fd.append(k, String(v));
    });

    const mainIdx = this.imagePreviews.findIndex(p => p.isMain);
    if (mainIdx >= 0 && this.selectedFiles[mainIdx]) {
      fd.append('imageFile', this.selectedFiles[mainIdx]);
    } else if (this.selectedFiles.length > 0) {
      fd.append('imageFile', this.selectedFiles[0]);
    }
    this.selectedFiles.forEach((f, i) => {
      if (i !== mainIdx) fd.append('additionalImages[]', f);
    });

    this.voitureService.createVoiture(fd).subscribe({
      next: (response: any) => {
        const newId = response?.id;
        if (!newId) { this.isSubmitting = false; this.router.navigate(['/voiture/list']); return; }
        this.postComplianceRecords(newId);
      },
      error: () => { this.isSubmitting = false; }
    });
  }

  private postComplianceRecords(voitureId: number): void {
    const achatV = this.form.value;
    const assV  = { ...this.assuranceForm.value };
    const vigV  = { ...this.vignetteForm.value };
    const inspV = { ...this.inspectionForm.value };

    const navigate = () => {
      this.isSubmitting = false;
      this.router.navigate(['/voiture', voitureId]);
    };

    // Build achat observable
    const postAchat$: Observable<any> = (achatV.fournisseurId || achatV.typeFinancement !== 'comptant' || achatV.prixAchat > 0)
      ? this.crud.create('achat-voiture', {
          voitureId,
          dateAchat:       achatV.dateAchat,
          prixAchat:       achatV.prixAchat,
          typeFinancement: achatV.typeFinancement || 'comptant',
          apport:          achatV.apport || 0,
          statut:          'actif',
          ...(achatV.fournisseurId ? { fournisseurId: achatV.fournisseurId } : {}),
          ...(this.isCreditType && achatV.mensualite > 0 ? { mensualite: achatV.mensualite } : {}),
          ...(this.isCreditType && achatV.tauxInteret > 0 ? { tauxInteret: achatV.tauxInteret } : {}),
        }).pipe(catchError(() => of(null)))
      : of(null);

    // Build assurance observable (skip if user skipped the step or left all fields empty)
    const hasAssurance = !this.complianceSkipped['assurance'] && !!(
      assV.compagnie || assV.dateFin || assV.dateDebut || assV.numeroContrat || assV.montant
    );
    const postAssurance$: Observable<any> = hasAssurance
      ? this.crud.create('assurance', { voitureId, ...this.compactObj(assV) }).pipe(
          switchMap((res: any) => {
            if (this.assuranceFile && res?.id) {
              const fd = new FormData();
              fd.append('file', this.assuranceFile);
              return this.crud.rawPost(`assurance/${res.id}/file`, fd).pipe(catchError(() => of(null)));
            }
            return of(res);
          }),
          catchError(() => of(null))
        )
      : of(null);

    // Build vignette observable (default dateLimite is pre-filled, so also gate on skipped flag)
    const hasVignette = !this.complianceSkipped['vignette'] && !!(vigV.dateLimite || vigV.annee);
    const postVignette$: Observable<any> = hasVignette
      ? this.crud.create('vignette', { voitureId, ...this.compactObj(vigV) }).pipe(
          switchMap((res: any) => {
            if (this.vignetteFile && res?.id) {
              const fd = new FormData();
              fd.append('file', this.vignetteFile);
              return this.crud.rawPost(`vignette/${res.id}/file`, fd).pipe(catchError(() => of(null)));
            }
            return of(res);
          }),
          catchError(() => of(null))
        )
      : of(null);

    // Build inspection observable (only for vehicles >= 3 years old and not skipped)
    const hasInspection = !this.complianceSkipped['inspection'] && this.needsInspection && !!(inspV.dateFin || inspV.dateReglages);
    const postInspection$: Observable<any> = hasInspection
      ? this.crud.create('suivi-technique', { voitureId, ...this.compactObj(inspV) }).pipe(catchError(() => of(null)))
      : of(null);

    postAchat$.pipe(
      switchMap(() => postAssurance$),
      switchMap(() => postVignette$),
      switchMap(() => postInspection$),
    ).subscribe({ next: navigate, error: navigate });
  }

  private compactObj(obj: Record<string, any>): Record<string, any> {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== ''));
  }

  t(key: string): string { return this.ts.translate(key); }
}
