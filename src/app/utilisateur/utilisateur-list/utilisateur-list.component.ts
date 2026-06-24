import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslationService } from '../../services/translation.service';
import { CrudService } from '../../services/crud.service';
import { BtnComponent } from '../../shared/btn/btn.component';
import { SignaturePadComponent } from '../../shared/signature-pad/signature-pad.component';

@Component({
  selector: 'app-utilisateur-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BtnComponent, SignaturePadComponent],
  templateUrl: './utilisateur-list.component.html',
  styleUrls: ['../../shared/styles/crud-list.css', './utilisateur-list.component.css']
})
export class UtilisateurListComponent implements OnInit {
  items: any[] = [];
  bureaux: any[] = [];
  companies: any[] = [];
  loading = true;
  error = '';
  dir = 'ltr';

  search = '';
  filterRole = '';
  filterBureau = '';
  filterStatus = '';

  sortField = 'nom';
  sortDir: 'asc' | 'desc' = 'asc';

  page = 1;
  readonly pageSize = 10;

  modalMode: 'form' | 'delete' | null = null;
  selected: any = null;
  isCreateMode = false;
  isSubmitting = false;
  deleteId: number | null = null;
  form: FormGroup;

  drawerUser: any = null;
  drawerOpen = false;
  drawerSignature: string | null = null;
  signatureMode: 'preview' | 'draw' = 'preview';
  signatureDrawing: string | null = null;
  signatureSaving = false;

  openDropdownId: number | null = null;

  resetPwModal = false;
  resetPwUser: any = null;
  resetPwSubmitting = false;
  resetPwError = '';
  resetPwForm: FormGroup;
  resetPwShowPw = false;

  selectedIds = new Set<number>();

  readonly endpoint = 'utilisateur';
  readonly availableRoles = ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF'];

  private readonly avatarPalette = [
    '#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#f97316','#06b6d4','#ec4899'
  ];

  constructor(
    private crud: CrudService,
    private ts: TranslationService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      nom:       ['', Validators.required],
      prenom:    [''],
      email:     ['', [Validators.required, Validators.email]],
      telephone: [''],
      roles:     [['ROLE_STAFF'] as string[]],
      bureauId:  [null],
      companyId: [null],
      actif:     [true],
      password:  [''],
    });
    this.resetPwForm = this.fb.group({
      newPassword:  ['', [Validators.required, Validators.minLength(8)]],
      forceChange:  [true],
    });
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.load();
    this.loadBureaux();
    this.loadCompanies();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.crud.getAll(this.endpoint).subscribe({
      next: r => { this.items = Array.isArray(r) ? r : (r?.data ?? []); this.loading = false; },
      error: () => { this.error = 'Failed to load users. Please try again.'; this.loading = false; }
    });
  }

  loadBureaux() {
    this.crud.getAll('bureau').subscribe({
      next: r => { this.bureaux = Array.isArray(r) ? r : (r?.data ?? []); },
      error: () => {}
    });
  }

  loadCompanies() {
    this.crud.getAll('company').subscribe({
      next: r => { this.companies = Array.isArray(r) ? r : (r?.data ?? []); },
      error: () => {}
    });
  }

  get stats() {
    return {
      total:    this.items.length,
      active:   this.items.filter(i => i.actif).length,
      admins:   this.items.filter(i => (i.roles || []).includes('ROLE_ADMIN')).length,
      managers: this.items.filter(i => (i.roles || []).includes('ROLE_MANAGER')).length,
      disabled: this.items.filter(i => !i.actif).length,
    };
  }

  get filtered(): any[] {
    let r = [...this.items];

    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      r = r.filter(i => [i.nom, i.prenom, i.email, i.telephone, i.bureauNom]
        .some(v => String(v || '').toLowerCase().includes(q)));
    }
    if (this.filterRole)   r = r.filter(i => (i.roles || []).includes(this.filterRole));
    if (this.filterBureau) r = r.filter(i => String(i.bureau) === this.filterBureau);
    if (this.filterStatus) r = r.filter(i => this.filterStatus === 'actif' ? i.actif : !i.actif);

    r.sort((a, b) => {
      const av = String(a[this.sortField] ?? '').toLowerCase();
      const bv = String(b[this.sortField] ?? '').toLowerCase();
      if (av < bv) return this.sortDir === 'asc' ? -1 : 1;
      if (av > bv) return this.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return r;
  }

  get paginated(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get activeFilters(): { key: string; label: string }[] {
    const chips: { key: string; label: string }[] = [];
    if (this.filterRole)   chips.push({ key: 'role',   label: this.filterRole.replace('ROLE_', '') });
    if (this.filterStatus) chips.push({ key: 'status', label: this.filterStatus === 'actif' ? 'Active' : 'Disabled' });
    if (this.filterBureau) {
      const b = this.bureaux.find(b => String(b.id) === this.filterBureau);
      chips.push({ key: 'bureau', label: b?.nom || 'Bureau' });
    }
    return chips;
  }

  removeFilter(key: string) {
    if (key === 'role')   this.filterRole = '';
    if (key === 'status') this.filterStatus = '';
    if (key === 'bureau') this.filterBureau = '';
    this.page = 1;
  }

  resetFilters() {
    this.search = ''; this.filterRole = ''; this.filterBureau = ''; this.filterStatus = '';
    this.page = 1;
  }

  sort(field: string) {
    this.sortDir = this.sortField === field && this.sortDir === 'asc' ? 'desc' : 'asc';
    this.sortField = field;
    this.page = 1;
  }

  getPagesArray(): number[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const start = Math.max(1, this.page - 2);
    const end   = Math.min(total, this.page + 2);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  paginationEnd(): number { return Math.min(this.page * this.pageSize, this.filtered.length); }

  get allSelected(): boolean {
    return this.paginated.length > 0 && this.paginated.every(i => this.selectedIds.has(i.id));
  }

  get someSelected(): boolean { return this.selectedIds.size > 0; }

  toggleAll() {
    if (this.allSelected) { this.paginated.forEach(i => this.selectedIds.delete(i.id)); }
    else { this.paginated.forEach(i => this.selectedIds.add(i.id)); }
    this.selectedIds = new Set(this.selectedIds);
  }

  toggleSelect(id: number) {
    if (this.selectedIds.has(id)) { this.selectedIds.delete(id); }
    else { this.selectedIds.add(id); }
    this.selectedIds = new Set(this.selectedIds);
  }

  clearSelection() { this.selectedIds = new Set(); }

  toggleDropdown(id: number, event: Event) {
    event.stopPropagation();
    this.openDropdownId = this.openDropdownId === id ? null : id;
  }

  @HostListener('document:click')
  onDocumentClick() { this.openDropdownId = null; }

  openDrawer(user: any) {
    this.drawerUser = user;
    this.drawerOpen = true;
    this.drawerSignature = null;
    this.signatureMode = 'preview';
    this.signatureDrawing = null;
    this.openDropdownId = null;
    this.crud.getById(this.endpoint, user.id).subscribe({
      next: (full: any) => { this.drawerSignature = full?.signatureBlob ?? null; },
      error: () => {},
    });
  }

  closeDrawer() {
    this.drawerOpen = false;
    this.signatureMode = 'preview';
    this.signatureDrawing = null;
    setTimeout(() => { this.drawerUser = null; this.drawerSignature = null; }, 320);
  }

  onSignatureDraw(sig: string | null) { this.signatureDrawing = sig; }

  saveSignature() {
    if (!this.drawerUser || this.signatureSaving) return;
    this.signatureSaving = true;
    this.crud.rawPut(`utilisateur/${this.drawerUser.id}/signature`, { signatureBlob: this.signatureDrawing }).subscribe({
      next: () => {
        this.drawerSignature = this.signatureDrawing;
        this.signatureMode = 'preview';
        this.signatureSaving = false;
      },
      error: () => { this.signatureSaving = false; },
    });
  }

  clearSignature() {
    if (!this.drawerUser) return;
    this.crud.rawDelete(`utilisateur/${this.drawerUser.id}/signature`).subscribe({
      next: () => { this.drawerSignature = null; this.signatureMode = 'preview'; this.signatureDrawing = null; },
      error: () => {},
    });
  }

  editFromDrawer() {
    const user = this.drawerUser;
    this.closeDrawer();
    setTimeout(() => this.openEdit(user), 330);
  }

  deleteFromDrawer() {
    const id = this.drawerUser?.id;
    this.closeDrawer();
    setTimeout(() => this.openDelete(id), 330);
  }

  openCreate() {
    this.isCreateMode = true;
    this.selected = null;
    this.form.reset({ nom: '', prenom: '', email: '', telephone: '', roles: ['ROLE_STAFF'], bureauId: null, companyId: null, actif: true, password: '' });
    this.form.get('password')!.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.get('password')!.updateValueAndValidity();
    this.modalMode = 'form';
    this.openDropdownId = null;
  }

  openEdit(item: any) {
    this.isCreateMode = false;
    this.selected = item;
    this.form.get('password')!.clearValidators();
    this.form.get('password')!.updateValueAndValidity();
    this.form.patchValue({
      nom: item.nom || '', prenom: item.prenom || '', email: item.email || '',
      telephone: item.telephone || '', roles: item.roles || ['ROLE_STAFF'],
      bureauId: item.bureau || null, companyId: item.companyId || null,
      actif: item.actif, password: '',
    });
    this.modalMode = 'form';
    this.openDropdownId = null;
  }

  openDelete(id: number) {
    this.deleteId = id;
    this.modalMode = 'delete';
    this.openDropdownId = null;
  }

  closeModal() {
    this.modalMode = null; this.selected = null; this.deleteId = null; this.isSubmitting = false;
    this.form.get('password')!.clearValidators();
    this.form.get('password')!.updateValueAndValidity();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.drawerOpen) { this.closeDrawer(); return; }
    this.closeModal();
  }

  save() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    const payload: any = { ...this.form.value };
    if (!payload.password) delete payload.password;
    if (payload.roles) payload.roles = payload.roles.filter((r: string) => r !== 'ROLE_USER');
    const obs = this.isCreateMode
      ? this.crud.create(this.endpoint, payload)
      : this.crud.update(this.endpoint, this.selected.id, payload);
    obs.subscribe({
      next: () => { this.closeModal(); this.load(); },
      error: () => { this.isSubmitting = false; }
    });
  }

  confirmDelete() {
    if (!this.deleteId) return;
    this.crud.remove(this.endpoint, this.deleteId).subscribe({
      next: () => { this.closeModal(); this.load(); },
      error: () => this.closeModal()
    });
  }

  toggleRole(role: string) {
    const roles: string[] = [...(this.form.value.roles || [])];
    const idx = roles.indexOf(role);
    if (idx > -1) { roles.splice(idx, 1); } else { roles.push(role); }
    this.form.patchValue({ roles: roles.length ? roles : ['ROLE_STAFF'] });
  }

  hasRole(role: string): boolean {
    return (this.form.value.roles as string[] || []).includes(role);
  }

  getInitials(item: any): string {
    const p = (item.prenom || '').charAt(0).toUpperCase();
    const n = (item.nom || '').charAt(0).toUpperCase();
    return (p + n) || '?';
  }

  getAvatarColor(item: any): string {
    const str = (item.nom || '') + (item.email || '');
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return this.avatarPalette[Math.abs(hash) % this.avatarPalette.length];
  }

  getPrimaryRole(roles: string[]): string {
    if (!roles?.length) return 'Staff';
    if (roles.includes('ROLE_ADMIN'))   return 'Admin';
    if (roles.includes('ROLE_MANAGER')) return 'Manager';
    if (roles.includes('ROLE_STAFF'))   return 'Staff';
    return 'Staff';
  }

  getRoleClass(roles: string[]): string {
    if (!roles?.length) return 'badge-staff';
    if (roles.includes('ROLE_ADMIN'))   return 'badge-admin';
    if (roles.includes('ROLE_MANAGER')) return 'badge-manager';
    return 'badge-staff';
  }

  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      ROLE_ADMIN:   'Admin',
      ROLE_MANAGER: 'Manager',
      ROLE_STAFF:   'Staff',
    };
    return map[role] ?? role.replace('ROLE_', '');
  }

  displayRoles(roles: string[]): string {
    return (roles || []).filter(r => r !== 'ROLE_USER').map(r => this.getRoleLabel(r)).join(', ') || '—';
  }

  visibleRoles(roles: string[]): string[] {
    return (roles || []).filter(r => r !== 'ROLE_USER');
  }

  openResetPw(item: any) {
    this.resetPwUser = item;
    this.resetPwModal = true;
    this.resetPwError = '';
    this.resetPwShowPw = false;
    this.resetPwForm.reset({ newPassword: '', forceChange: true });
    this.openDropdownId = null;
  }

  closeResetPw() {
    this.resetPwModal = false;
    this.resetPwUser = null;
    this.resetPwSubmitting = false;
    this.resetPwError = '';
  }

  submitResetPw() {
    if (this.resetPwForm.invalid) { this.resetPwForm.markAllAsTouched(); return; }
    this.resetPwSubmitting = true;
    this.resetPwError = '';
    const { newPassword, forceChange } = this.resetPwForm.value;
    this.crud.rawPost(`password/admin/reset/${this.resetPwUser.id}`, { newPassword, forceChange }).subscribe({
      next: () => {
        this.resetPwSubmitting = false;
        this.closeResetPw();
      },
      error: (err: any) => {
        this.resetPwSubmitting = false;
        this.resetPwError = err?.error?.error || 'Failed to reset password';
      }
    });
  }
}
