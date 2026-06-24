import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../services/toast.service';
import { BtnComponent } from '../../shared/btn/btn.component';
import { UploadBtnComponent } from '../../shared/btn/upload-btn.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-company-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BtnComponent, UploadBtnComponent],
  templateUrl: './company-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css', './company-list.component.css']
})
export class CompanyListComponent implements OnInit {
  companies: any[] = [];
  users: any[] = [];
  loading = true;
  error = '';
  isAdmin = false;

  modalMode: 'create' | 'edit' | 'delete' | null = null;
  selected: any = null;
  isSubmitting = false;
  logoPreview: string | null = null;
  private logoFile: File | null = null;
  private blobUrl: string | null = null;

  form: FormGroup;

  private readonly api = `${environment.apiUrl}/company`;
  private readonly usersApi = `${environment.apiUrl}/utilisateur`;

  constructor(
    private http: HttpClient,
    private toast: ToastService,
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.form = this.fb.group({
      nom:       ['', Validators.required],
      managerId: [null, Validators.required],
      staffIds:  [[]]
    });
  }

  ngOnInit() {
    this.isAdmin = this.authService.hasRole('ROLE_ADMIN');
    this.load();
    this.loadUsers();
  }

  load() {
    this.loading = true;
    this.http.get<any[]>(this.api).subscribe({
      next: (res) => { this.companies = Array.isArray(res) ? res : []; this.loading = false; },
      error: () => { this.error = 'Failed to load companies.'; this.loading = false; }
    });
  }

  loadUsers() {
    this.http.get<any>(`${this.usersApi}?limit=100`).subscribe({
      next: (r) => { this.users = Array.isArray(r) ? r : (r?.data ?? []); }
    });
  }

  get managers(): any[] {
    return this.users.filter(u => (u.roles || []).includes('ROLE_MANAGER'));
  }

  get staffOptions(): any[] {
    return this.users.filter(u => !(u.roles || []).includes('ROLE_ADMIN'));
  }

  onLogoChange(file: File) {
    this.logoFile = file;
    if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
    this.blobUrl = URL.createObjectURL(file);
    this.logoPreview = this.blobUrl;
  }

  removeLogo() {
    this.logoFile = null;
    if (this.blobUrl) { URL.revokeObjectURL(this.blobUrl); this.blobUrl = null; }
    this.logoPreview = null;
  }

  toggleStaff(uid: number) {
    const ids: number[] = [...(this.form.value.staffIds || [])];
    const idx = ids.indexOf(uid);
    idx > -1 ? ids.splice(idx, 1) : ids.push(uid);
    this.form.patchValue({ staffIds: ids });
  }

  hasStaff(uid: number): boolean {
    return (this.form.value.staffIds || []).includes(uid);
  }

  openCreate() {
    this.selected = null;
    this.logoPreview = null;
    this.logoFile = null;
    this.form.reset({ nom: '', managerId: null, staffIds: [] });
    this.modalMode = 'create';
  }

  openEdit(company: any) {
    this.selected = company;
    this.logoPreview = company.logo ? environment.serverUrl + company.logo : null;
    this.logoFile = null;
    this.form.patchValue({
      nom:       company.nom,
      managerId: company.manager?.id ?? null,
      staffIds:  (company.staff || []).map((s: any) => s.id)
    });
    this.modalMode = 'edit';
  }

  openDelete(company: any) {
    this.selected = company;
    this.modalMode = 'delete';
  }

  closeModal() {
    this.modalMode = null;
    this.selected = null;
    this.isSubmitting = false;
    if (this.blobUrl) { URL.revokeObjectURL(this.blobUrl); this.blobUrl = null; }
    this.logoPreview = null;
    this.logoFile = null;
  }

  @HostListener('document:keydown.escape') onEscape() { this.closeModal(); }

  save() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    const payload = { ...this.form.value };

    const uploadLogoThen = (id: number) => {
      if (!this.logoFile) { this.closeModal(); this.load(); return; }
      const fd = new FormData();
      fd.append('logoFile', this.logoFile);
      this.http.post(`${this.api}/${id}/logo`, fd).subscribe({
        next: () => { this.closeModal(); this.load(); },
        error: () => { this.closeModal(); this.load(); }
      });
    };

    if (this.modalMode === 'create') {
      this.http.post<any>(this.api, payload).subscribe({
        next: (res) => { this.toast.show('Company created', 'success'); uploadLogoThen(res.id); },
        error: (err) => { this.isSubmitting = false; this.toast.show(err?.error?.error || 'Error', 'error'); }
      });
    } else {
      if (!this.selected?.logo && !this.logoFile) payload['logo'] = null;
      this.http.put(`${this.api}/${this.selected.id}`, payload).subscribe({
        next: () => { this.toast.show('Company updated', 'success'); uploadLogoThen(this.selected.id); },
        error: (err) => { this.isSubmitting = false; this.toast.show(err?.error?.error || 'Error', 'error'); }
      });
    }
  }

  confirmDelete() {
    if (!this.selected) return;
    this.http.delete(`${this.api}/${this.selected.id}`).subscribe({
      next: () => { this.toast.show('Company deleted', 'info'); this.closeModal(); this.load(); },
      error: (err) => { this.toast.show(err?.error?.error || 'Error', 'error'); this.closeModal(); }
    });
  }

  imgUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) return path;
    return environment.serverUrl + path;
  }

  userName(u: any): string {
    return `${u.prenom || ''} ${u.nom || ''}`.trim() || u.email;
  }
}
