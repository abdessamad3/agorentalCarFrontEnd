import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CrudService } from '../../services/crud.service';
import { TranslationService } from '../../services/translation.service';
import { SignaturePadComponent } from '../../shared/signature-pad/signature-pad.component';

const ROLE_LABELS: Record<string, string> = {
  ROLE_ADMIN:      'Admin',
  ROLE_MANAGER:    'Manager',
  ROLE_STAFF:      'Staff',
  ROLE_ACCOUNTANT: 'Accountant',
  ROLE_MECHANIC:   'Mechanic',
  ROLE_USER:       'User',
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SignaturePadComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  dir = 'ltr';
  loading = true;
  saving = false;
  editing = false;

  user: any = null;
  form: FormGroup;

  myBureaus: any[] = [];
  loadingBureaus = false;

  signatureMode: 'preview' | 'draw' = 'preview';
  signatureDrawing: string | null = null;
  signatureSaving = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private crud: CrudService,
    private ts: TranslationService,
  ) {
    this.form = this.fb.group({
      nom:       ['', Validators.required],
      prenom:    ['', Validators.required],
      email:     ['', [Validators.required, Validators.email]],
      telephone: [''],
    });
  }

  ngOnInit(): void {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
  }

  private get userId(): number | null {
    return this.auth.getStoredUser()?.id ?? null;
  }

  load(): void {
    const id = this.userId;
    if (!id) { this.loading = false; return; }
    this.loading = true;
    this.crud.getById('utilisateur', id).subscribe({
      next: (data) => {
        this.user = data;
        this.form.patchValue({
          nom: data.nom, prenom: data.prenom, email: data.email, telephone: data.telephone,
        });
        this.loading = false;
        if (this.isManager) this.loadMyBureaus();
      },
      error: () => { this.loading = false; },
    });
  }

  get isManager(): boolean {
    return !!this.user?.roles?.includes('ROLE_MANAGER');
  }

  loadMyBureaus(): void {
    if (!this.user?.bureau) { this.myBureaus = []; return; }
    this.loadingBureaus = true;
    this.crud.getById('bureau', this.user.bureau).subscribe({
      next: (b) => {
        this.myBureaus = b ? [b] : [];
        this.loadingBureaus = false;
      },
      error: () => { this.loadingBureaus = false; },
    });
  }

  get initials(): string {
    const i = (this.user?.prenom?.[0] ?? '') + (this.user?.nom?.[0] ?? '');
    return i.toUpperCase() || '?';
  }

  get fullName(): string {
    return [this.user?.prenom, this.user?.nom].filter(Boolean).join(' ');
  }

  t(key: string): string { return this.ts.translate(key); }

  roleLabel(role: string): string {
    return ROLE_LABELS[role] ?? role.replace('ROLE_', '');
  }

  toggleEdit(): void {
    if (this.editing) {
      this.form.patchValue({
        nom: this.user.nom, prenom: this.user.prenom, email: this.user.email, telephone: this.user.telephone,
      });
    }
    this.editing = !this.editing;
  }

  save(): void {
    if (this.form.invalid || !this.userId) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const { nom, prenom, email, telephone } = this.form.value;
    this.crud.update('utilisateur', this.userId, { nom, prenom, email, telephone }).subscribe({
      next: () => {
        this.user = { ...this.user, nom, prenom, email, telephone };
        this.saving = false;
        this.editing = false;
      },
      error: () => { this.saving = false; },
    });
  }

  onSignatureDraw(sig: string | null): void {
    this.signatureDrawing = sig;
  }

  saveSignature(): void {
    if (!this.userId || this.signatureSaving) return;
    this.signatureSaving = true;
    this.crud.rawPut(`utilisateur/${this.userId}/signature`, { signatureBlob: this.signatureDrawing }).subscribe({
      next: () => {
        this.user.signatureBlob = this.signatureDrawing;
        this.signatureMode = 'preview';
        this.signatureSaving = false;
      },
      error: () => { this.signatureSaving = false; },
    });
  }

  clearSignature(): void {
    if (!this.userId) return;
    this.crud.rawDelete(`utilisateur/${this.userId}/signature`).subscribe({
      next: () => {
        this.user.signatureBlob = null;
        this.signatureMode = 'preview';
        this.signatureDrawing = null;
      },
    });
  }
}
