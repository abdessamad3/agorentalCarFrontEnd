import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { VoitureService } from '../../services/voiture.service';
import { TranslationService } from '../../services/translation.service';
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
  activeSection = 0;

  // Image management
  selectedFiles: File[] = [];
  imagePreviews: { url: string; name: string; size: string; isMain: boolean }[] = [];
  isDragging = false;

  readonly SECTIONS = [
    { key: 'technical',    icon: '⚙️',  labelKey: 'technicalInfo'  },
    { key: 'financial',    icon: '💰',  labelKey: 'financialInfo'  },
    { key: 'admin',        icon: '📋',  labelKey: 'adminInfo'      },
    { key: 'images',       icon: '📸',  labelKey: 'vehicleImages'  },
  ];

  readonly FUEL_OPTIONS    = ['Essence','Diesel','Hybride','Electrique','GPL'];
  readonly TRANS_OPTIONS   = ['Manuelle','Automatique'];
  readonly STATUS_OPTIONS  = ['disponible','louee','maintenance','hors_service'];
  readonly CAT_OPTIONS     = ['Citadine','Berline','SUV','4x4','Monospace','Cabriolet','Utilitaire','Coupé','Pick-up'];

  constructor(
    private fb: FormBuilder,
    private voitureService: VoitureService,
    private ts: TranslationService,
    private router: Router
  ) {
    this.form = this.fb.group({
      // Technical
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
      couleur:           [''],
      places:            [5, [Validators.min(1), Validators.max(20)]],
      portes:            [4, [Validators.min(2), Validators.max(6)]],
      puissanceCv:       [''],
      categorie:         [''],
      climatisation:     [false],
      kilometrageActuel: [0, Validators.min(0)],
      voitureStatus:     ['disponible'],

      // Financial
      prixJour:  [0, [Validators.required, Validators.min(0)]],
      prixSemaine:[0, Validators.min(0)],
      prixMois:  [0, Validators.min(0)],
      prixAchat: [0, Validators.min(0)],
      caution:   [0, Validators.min(0)],
      dateAchat: [''],

      // Admin / Documents
      dateExpirationAssurance: [''],
      dateExpirationVignette:  [''],
      dateExpirationVisite:    [''],
    });
  }

  ngOnInit(): void {
    this.ts.direction$.subscribe(d => this.dir = d);
  }

  // ── Image handling ────────────────────────────────────────────────────────

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(Array.from(input.files));
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault(); this.isDragging = false;
    if (event.dataTransfer?.files) this.addFiles(Array.from(event.dataTransfer.files));
  }

  onDragOver(event: DragEvent): void  { event.preventDefault(); this.isDragging = true; }
  onDragLeave(event: DragEvent): void { this.isDragging = false; }

  addFiles(files: File[]): void {
    const imgs = files.filter(f => f.type.startsWith('image/'));
    imgs.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreviews.push({
          url: e.target?.result as string,
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
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  filterDigits(el: EventTarget | null): void {
    if (!el) return;
    const input = el as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
  }

  filterLetter(el: EventTarget | null): void {
    if (!el) return;
    const input = el as HTMLInputElement;
    input.value = input.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.form.invalid) { this.activeSection = 0; return; }

    this.isSubmitting = true;
    const fd = new FormData();

    const plateFields = new Set(['immatNum1', 'immatLetter', 'immatNum2']);
    const { immatNum1, immatLetter, immatNum2, ...rest } = this.form.value;
    const plate = [immatNum1, (immatLetter || '').toUpperCase(), immatNum2].filter(Boolean).join('-');
    if (plate) fd.append('immatriculation', plate);

    Object.entries(rest).forEach(([k, v]) => {
      if (!plateFields.has(k) && v !== null && v !== undefined && v !== '') fd.append(k, String(v));
    });

    // Main image first (required by existing backend)
    const mainIdx = this.imagePreviews.findIndex(p => p.isMain);
    if (mainIdx >= 0 && this.selectedFiles[mainIdx]) {
      fd.append('imageFile', this.selectedFiles[mainIdx]);
    } else if (this.selectedFiles.length > 0) {
      fd.append('imageFile', this.selectedFiles[0]);
    }

    // Additional images
    this.selectedFiles.forEach((f, i) => {
      if (i !== mainIdx) fd.append('additionalImages[]', f);
    });

    this.voitureService.createVoiture(fd).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/voiture/list']);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error(err);
      }
    });
  }

  t(key: string): string { return this.ts.translate(key); }

  get isValid(): boolean { return this.form.valid; }
}
