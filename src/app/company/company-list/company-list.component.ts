import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../services/toast.service';
import { TranslationService } from '../../services/translation.service';
import { BtnComponent } from '../../shared/btn/btn.component';
import { UploadBtnComponent } from '../../shared/btn/upload-btn.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { AuthService } from '../../services/auth.service';
import { PAGE_SIZE } from '../../shared/constants/pagination';

@Component({
  selector: 'app-company-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BtnComponent, UploadBtnComponent, PaginatorComponent],
  templateUrl: './company-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css', './company-list.component.css']
})
export class CompanyListComponent implements OnInit, OnDestroy {
  companies: any[] = [];
  users: any[] = [];
  loading = true;
  error   = '';
  isAdmin = false;
  dir     = 'ltr';

  page  = 1;
  limit = PAGE_SIZE;
  total = 0;

  modalMode: 'create' | 'edit' | 'delete' | null = null;
  selected:    any  = null;
  deleteId:    number | null = null;
  isSubmitting = false;
  logoPreview: string | null = null;
  private logoFile: File | null = null;
  private blobUrl:  string | null = null;

  form: FormGroup;

  private readonly api      = `${environment.apiUrl}/company`;
  private readonly usersApi = `${environment.apiUrl}/utilisateur`;
  private destroy$          = new Subject<void>();

  constructor(
    private http:        HttpClient,
    private toast:       ToastService,
    private fb:          FormBuilder,
    private authService: AuthService,
    private ts:          TranslationService,
  ) {
    this.form = this.fb.group({
      nom:       ['', Validators.required],
      managerId: [null, Validators.required],
      staffIds:  [[]]
    });
  }

  ngOnInit() {
    this.isAdmin = this.authService.hasRole('ROLE_ADMIN');
    this.ts.direction$.pipe(takeUntil(this.destroy$)).subscribe(d => this.dir = d);
    this.load();
    this.loadUsers();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  t(key: string): string { return this.ts.translate(key); }

  load() {
    this.loading = true;
    this.error   = '';
    this.http.get<any>(this.api, { params: { page: this.page, limit: this.limit } }).subscribe({
      next: (res) => {
        if (res?.data) {
          this.companies = res.data;
          this.total     = res.meta?.total ?? 0;
        } else {
          this.companies = Array.isArray(res) ? res : [];
          this.total     = this.companies.length;
        }
        this.loading = false;
      },
      error: () => { this.error = this.t('loadError'); this.loading = false; }
    });
  }

  loadUsers() {
    this.http.get<any>(`${this.usersApi}?limit=200`).subscribe({
      next: (r) => { this.users = Array.isArray(r) ? r : (r?.data ?? []); }
    });
  }

  onPageChange(p: number) { this.page = p; this.load(); }

  // Managers: users with ROLE_MANAGER or ROLE_ADMIN
  get managers(): any[] {
    return this.users.filter(u => {
      const roles: string[] = u.roles || [];
      return roles.includes('ROLE_MANAGER') || roles.includes('ROLE_ADMIN');
    });
  }

  // Staff options: all non-admin users
  get staffOptions(): any[] {
    return this.users.filter(u => !(u.roles || []).includes('ROLE_ADMIN'));
  }

  onLogoChange(file: File) {
    this.logoFile = file;
    if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
    this.blobUrl    = URL.createObjectURL(file);
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
    this.selected    = null;
    this.deleteId    = null;
    this.logoPreview = null;
    this.logoFile    = null;
    this.form.reset({ nom: '', managerId: null, staffIds: [] });
    this.modalMode = 'create';
  }

  openEdit(company: any) {
    this.selected    = company;
    this.logoPreview = company.logo ? environment.serverUrl + company.logo : null;
    this.logoFile    = null;
    this.form.patchValue({
      nom:       company.nom,
      managerId: company.manager?.id ?? null,
      staffIds:  (company.staff || []).map((s: any) => s.id)
    });
    this.modalMode = 'edit';
  }

  openDelete(id: number) {
    this.deleteId = id;
    this.selected = this.companies.find(c => c.id === id) ?? null;
    this.modalMode = 'delete';
  }

  closeModal() {
    this.modalMode   = null;
    this.selected    = null;
    this.deleteId    = null;
    this.isSubmitting = false;
    if (this.blobUrl) { URL.revokeObjectURL(this.blobUrl); this.blobUrl = null; }
    this.logoPreview = null;
    this.logoFile    = null;
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
        next:  () => { this.closeModal(); this.load(); },
        error: () => { this.closeModal(); this.load(); }
      });
    };

    if (this.modalMode === 'create') {
      this.http.post<any>(this.api, payload).subscribe({
        next:  (res) => { this.toast.show(this.t('companyCreated'), 'success'); uploadLogoThen(res.id); },
        error: (err) => { this.isSubmitting = false; this.toast.show(err?.error?.error || this.t('error'), 'error'); }
      });
    } else {
      if (!this.selected?.logo && !this.logoFile) payload['logo'] = null;
      this.http.put(`${this.api}/${this.selected.id}`, payload).subscribe({
        next:  () => { this.toast.show(this.t('companyUpdated'), 'success'); uploadLogoThen(this.selected.id); },
        error: (err) => { this.isSubmitting = false; this.toast.show(err?.error?.error || this.t('error'), 'error'); }
      });
    }
  }

  confirmDelete() {
    if (!this.deleteId) return;
    this.http.delete(`${this.api}/${this.deleteId}`).subscribe({
      next:  () => { this.toast.show(this.t('companyDeleted'), 'info'); this.closeModal(); this.load(); },
      error: (err) => { this.toast.show(err?.error?.error || this.t('error'), 'error'); this.closeModal(); }
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
