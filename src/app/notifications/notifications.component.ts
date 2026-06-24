import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CrudService } from '../services/crud.service';
import { TranslationService } from '../services/translation.service';
import { ExportService } from '../services/export.service';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { UploadBtnComponent } from '../shared/btn/upload-btn.component';

type NotifStatus = 'expired' | 'critical' | 'warning' | 'ok';
type NotifSource = 'assurance' | 'vignette' | 'visite' | 'contrat' | 'vidange';

interface Notif {
  id: number;
  source: NotifSource;
  vehicleLabel: string;
  vehicleId: number;
  expiryDate: string;
  daysLeft: number;
  status: NotifStatus;
  detail: string;
  kmLeft?: number;
  isKmBased?: boolean;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, UploadBtnComponent],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {
  loading = true;
  dir = 'ltr';
  all: Notif[] = [];

  search        = '';
  statusFilter: '' | NotifStatus = '';
  sourceFilter: '' | NotifSource = '';
  bureauFilter  = '';
  vehicleFilter = '';

  collapsed: Record<string, boolean> = {};

  bureaux: { id: number; nom: string }[] = [];
  private carsData:     any[] = [];
  private carBureauMap: Record<number, number> = {};

  // Renew / Pay modal
  renewNotif:           Notif | null = null;
  renewForm!:           FormGroup;
  renewSubmitting       = false;
  renewFile:            File | null = null;
  renewFilePreview:     string | null = null;
  renewCompagnieIsOther = false;

  readonly MOROCCAN_INSURERS = [
    'Wafa Assurance', 'AXA Assurance Maroc', 'Allianz Maroc', 'Atlanta Assurance',
    'Saham Assurance', 'RMA Assurance', 'MCMA', 'MAMDA', 'Zurich Assurance Maroc',
    'Sanlam Maroc', 'CNIA Assurance', 'Essaada Assurance',
    'Maroc Assistance Internationale', 'Euler Hermes Acmar',
  ];
  readonly COVERAGE_TYPES = ['RC', 'Tous Risques', 'Tiers Étendu', 'Tiers Simple'];
  readonly DOC_ENDPOINTS: Record<string, string> = {
    assurance: 'assurance', vignette: 'vignette', visite: 'suivi-technique',
  };
  readonly UPLOAD_TYPE: Record<string, string> = {
    assurance: 'insurance', vignette: 'vignette', visite: 'technical-inspection',
  };

  constructor(
    private crud: CrudService,
    private ts:   TranslationService,
    private fb:   FormBuilder,
    private exportSvc: ExportService,
  ) {}

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.loadBureaux();
    this.loadAll();
  }

  // ── Data loading ────────────────────────────────────────────────────────────

  private loadBureaux(): void {
    this.crud.getAll('bureau', { limit: 200 }).pipe(catchError(() => of([]))).subscribe((r: any) => {
      this.bureaux = Array.isArray(r) ? r : (r?.data ?? []);
    });
  }

  private loadAll(): void {
    this.loading = true;
    const safe = (obs: any) => obs.pipe(catchError(() => of([])));
    forkJoin({
      cars:         this.loadAllCars(),
      assurances:   safe(this.crud.getAll('assurance',       { limit: 2000 })),
      vignettes:    safe(this.crud.getAll('vignette',        { limit: 2000 })),
      visites:      safe(this.crud.getAll('suivi-technique', { limit: 2000 })),
      contrats:     safe(this.crud.getAll('contrat',         { limit: 2000 })),
      oilReminders: safe(this.crud.getAll('dashboard/oil-reminders')),
    }).subscribe({
      next: ({ cars, assurances, vignettes, visites, contrats, oilReminders }: any) => {
        this.carsData = this.toArr(cars);
        const carMap: Record<number, string> = {};
        this.carBureauMap = {};
        this.carsData.forEach((c: any) => {
          carMap[c.id] = `${c.marque || ''} ${c.modele || ''} (${c.immatriculation || ''})`.trim();
          const bid = c.bureauId ?? c.bureau?.id;
          if (bid) this.carBureauMap[c.id] = +bid;
        });

        const dateNotifs = [
          ...this.mapAssurances(this.toArr(assurances), carMap),
          ...this.mapVignettes(this.toArr(vignettes),   carMap),
          ...this.mapVisites(this.toArr(visites),        carMap),
          ...this.mapContrats(this.toArr(contrats),      carMap),
        ].filter((n, i, arr) =>
          arr.findIndex(x => x.source === n.source && x.vehicleId === n.vehicleId) === i
        ).sort((a, b) => a.daysLeft - b.daysLeft);

        const oilNotifs = this.mapVidanges(oilReminders);
        this.all     = [...dateNotifs, ...oilNotifs];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  // ── Computed sections ───────────────────────────────────────────────────────

  get filtered(): Notif[] {
    let r = this.all;
    if (this.statusFilter)  r = r.filter(n => n.status === this.statusFilter);
    if (this.sourceFilter)  r = r.filter(n => n.source === this.sourceFilter);
    if (this.bureauFilter)  r = r.filter(n => this.carBureauMap[n.vehicleId] === +this.bureauFilter);
    if (this.vehicleFilter) r = r.filter(n => n.vehicleId === +this.vehicleFilter);
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      r = r.filter(n =>
        n.vehicleLabel.toLowerCase().includes(q) ||
        n.detail.toLowerCase().includes(q)
      );
    }
    return r;
  }

  get expired():  Notif[] { return this.filtered.filter(n => n.status === 'expired');  }
  get critical(): Notif[] { return this.filtered.filter(n => n.status === 'critical'); }
  get warning():  Notif[] { return this.filtered.filter(n => n.status === 'warning');  }
  get ok():       Notif[] { return this.filtered.filter(n => n.status === 'ok');       }

  get counts() {
    return {
      total:    this.all.length,
      expired:  this.all.filter(n => n.status === 'expired').length,
      critical: this.all.filter(n => n.status === 'critical').length,
      warning:  this.all.filter(n => n.status === 'warning').length,
      ok:       this.all.filter(n => n.status === 'ok').length,
    };
  }

  get vehicles(): { id: number; label: string }[] {
    const seen = new Set<number>();
    return this.all
      .filter(n => { if (seen.has(n.vehicleId)) return false; seen.add(n.vehicleId); return true; })
      .map(n => ({ id: n.vehicleId, label: n.vehicleLabel }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  get hasAnyResult(): boolean {
    return this.expired.length + this.critical.length + this.warning.length + this.ok.length > 0;
  }

  // ── Section controls ────────────────────────────────────────────────────────

  toggleSection(key: string): void { this.collapsed[key] = !this.collapsed[key]; }

  setStatusFilter(v: '' | NotifStatus) { this.statusFilter = v; }

  // ── Label / routing helpers ─────────────────────────────────────────────────

  actionLabel(source: NotifSource): string {
    const m: Record<NotifSource, string> = {
      assurance: 'Renew Insurance',
      vignette:  'Pay Vignette',
      visite:    'Create Inspection',
      contrat:   'View Contract',
      vidange:   'View Car',
    };
    return m[source];
  }

  actionClass(source: NotifSource): string {
    const m: Record<NotifSource, string> = {
      assurance: 'cc-btn-ins',
      vignette:  'cc-btn-vig',
      visite:    'cc-btn-insp',
      contrat:   'cc-btn-view',
      vidange:   'cc-btn-view',
    };
    return m[source];
  }

  canRenew(source: NotifSource): boolean {
    return source === 'assurance' || source === 'vignette' || source === 'visite';
  }

  sourceLabel(s: NotifSource): string {
    const m: Record<NotifSource, string> = {
      assurance: 'Insurance', vignette: 'Vignette', visite: 'Inspection',
      contrat: 'Contract', vidange: 'Oil Change',
    };
    return m[s];
  }

  sourceIcon(s: NotifSource): string {
    const m: Record<NotifSource, string> = {
      assurance: '🛡️', vignette: '📄', visite: '🔬', contrat: '📋', vidange: '🛢️',
    };
    return m[s];
  }

  sourceRoute(s: NotifSource): string {
    const m: Record<NotifSource, string> = {
      assurance: '/assurance', vignette: '/vignette', visite: '/suivi-technique',
      contrat: '/contrat', vidange: '/voiture',
    };
    return m[s];
  }

  vehicleRoute(n: Notif): string {
    return n.source === 'vidange' ? `/voiture/${n.vehicleId}` : this.sourceRoute(n.source);
  }

  statusLabel(s: NotifStatus): string {
    const m: Record<NotifStatus, string> = {
      expired: 'Expired', critical: 'Critical', warning: 'Due Soon', ok: 'OK',
    };
    return m[s];
  }

  daysLabel(days: number): string {
    if (days < 0)   return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `in ${days}d`;
  }

  // ── PDF export ──────────────────────────────────────────────────────────────

  exportPDF() {
    this.exportSvc.compliancePDF(this.expired, this.critical, this.warning);
  }

  // ── CSV export ──────────────────────────────────────────────────────────────

  exportCSV() {
    const headers = ['Type', 'Vehicle', 'Detail', 'Expiry Date', 'Days Left', 'Status'];
    const rows = this.filtered.map(n => [
      this.sourceLabel(n.source), n.vehicleLabel, n.detail, n.expiryDate,
      n.isKmBased ? `${n.kmLeft} km` : n.daysLeft,
      this.statusLabel(n.status),
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'compliance.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Renew / Pay modal ───────────────────────────────────────────────────────

  @HostListener('document:keydown.escape')
  onEscape() { this.closeRenewModal(); }

  openRenewModal(n: Notif): void {
    if (!this.canRenew(n.source)) return;
    this.renewNotif = n;
    const existing = (n.expiryDate ?? '').split('T')[0];
    this.renewForm = this.fb.group({
      dateFin:        [n.source !== 'vignette' ? existing : '', n.source !== 'vignette' ? Validators.required : null],
      dateDebut:      [''],
      montant:        [null],
      compagnie:      [''],
      compagnieOther: [''],
      typeAssurance:  [''],
      numeroContrat:  [''],
      annee:          [new Date().getFullYear()],
      dateLimite:     [n.source === 'vignette' ? existing : '', n.source === 'vignette' ? Validators.required : null],
      dateReglages:   [''],
    });
    this.renewFile              = null;
    this.renewFilePreview       = null;
    this.renewSubmitting        = false;
    this.renewCompagnieIsOther  = false;
  }

  closeRenewModal(): void {
    this.renewNotif           = null;
    this.renewSubmitting      = false;
    this.renewFile            = null;
    this.renewFilePreview     = null;
    this.renewCompagnieIsOther = false;
  }

  onRenewCompagnieChange(): void {
    this.renewCompagnieIsOther = this.renewForm.get('compagnie')?.value === 'Autre';
    if (!this.renewCompagnieIsOther) this.renewForm.get('compagnieOther')?.setValue('');
  }

  onRenewFileSelect(file: File): void {
    this.renewFile = file;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => this.renewFilePreview = e.target?.result as string;
      reader.readAsDataURL(file);
    } else {
      this.renewFilePreview = null;
    }
  }

  saveRenewDoc(): void {
    if (!this.renewNotif) return;
    if (!this.renewNotif.vehicleId || isNaN(this.renewNotif.vehicleId)) return;
    if (this.renewForm.invalid) { this.renewForm.markAllAsTouched(); return; }

    this.renewSubmitting = true;
    const n        = this.renewNotif;
    const v        = this.renewForm.value;
    const endpoint = this.DOC_ENDPOINTS[n.source];

    let payload: any = { voitureId: n.vehicleId };
    if (n.source === 'assurance') {
      payload.dateFin = v.dateFin;
      if (v.dateDebut)     payload.dateDebut     = v.dateDebut;
      const compagnie = v.compagnie === 'Autre' ? (v.compagnieOther || '') : v.compagnie;
      if (compagnie)       payload.compagnie     = compagnie;
      if (v.typeAssurance) payload.typeAssurance = v.typeAssurance;
      if (v.numeroContrat) payload.numeroContrat = v.numeroContrat;
      if (v.montant)       payload.montant       = parseFloat(v.montant);
    } else if (n.source === 'vignette') {
      payload.dateLimite = v.dateLimite;
      payload.annee      = +v.annee;
      if (v.montant) payload.montant = parseFloat(v.montant);
    } else {
      payload.dateFin = v.dateFin;
      if (v.dateReglages) payload.dateReglages = v.dateReglages;
      if (v.montant)      payload.montant      = parseFloat(v.montant);
    }

    const file   = this.renewFile;
    const source = n.source;

    this.crud.create(endpoint, payload).subscribe({
      next: (created: any) => {
        const recordId = created?.id;
        this.closeRenewModal();
        const finish = () => this.loadAll();
        if (file && recordId) {
          this.crud.uploadDocumentFile(this.UPLOAD_TYPE[source], recordId, file)
            .subscribe({ next: finish, error: finish });
        } else {
          finish();
        }
      },
      error: () => { this.renewSubmitting = false; }
    });
  }

  // ── Private mappers ─────────────────────────────────────────────────────────

  private daysBetween(dateStr: string): number {
    if (!dateStr) return 9999;
    const exp = new Date(dateStr);
    if (isNaN(exp.getTime())) return 9999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);
    return Math.floor((exp.getTime() - today.getTime()) / 86400000);
  }

  private statusFor(days: number): NotifStatus {
    if (days < 0)   return 'expired';
    if (days <= 7)  return 'critical';
    if (days <= 30) return 'warning';
    return 'ok';
  }

  private mapAssurances(items: any[], carMap: Record<number, string>): Notif[] {
    return items.filter(i => i.dateFin).map(i => {
      const vid  = i.voitureId ?? i.voiture?.id ?? i.voiture;
      const days = this.daysBetween(i.dateFin);
      return {
        id: i.id, source: 'assurance' as NotifSource,
        vehicleLabel: carMap[vid] || `#${vid}`,
        vehicleId: +vid,
        expiryDate: i.dateFin, daysLeft: days, status: this.statusFor(days),
        detail: [i.compagnie, i.typeAssurance].filter(Boolean).join(' — ') || '—',
      };
    });
  }

  private mapVignettes(items: any[], carMap: Record<number, string>): Notif[] {
    return items.filter(i => i.dateLimite).map(i => {
      const vid  = i.voitureId ?? i.voiture?.id ?? i.voiture;
      const days = this.daysBetween(i.dateLimite);
      return {
        id: i.id, source: 'vignette' as NotifSource,
        vehicleLabel: carMap[vid] || `#${vid || i.annee}`,
        vehicleId: +vid,
        expiryDate: i.dateLimite, daysLeft: days, status: this.statusFor(days),
        detail: i.annee ? `Year ${i.annee}` : '—',
      };
    });
  }

  private mapVisites(items: any[], carMap: Record<number, string>): Notif[] {
    return items.filter(i => {
      if (!i.dateFin) return false;
      const vid = i.voitureId ?? i.voiture?.id ?? i.voiture;
      const car = this.carsData.find((c: any) => c.id === +vid);
      if (car?.compliance?.visite?.status === 'NOT_REQUIRED') return false;
      return true;
    }).map(i => {
      const vid  = i.voitureId ?? i.voiture?.id ?? i.voiture;
      const days = this.daysBetween(i.dateFin);
      return {
        id: i.id, source: 'visite' as NotifSource,
        vehicleLabel: carMap[vid] || `#${vid}`,
        vehicleId: +vid,
        expiryDate: i.dateFin, daysLeft: days, status: this.statusFor(days),
        detail: i.dateReglages
          ? `Checked: ${new Date(i.dateReglages).toLocaleDateString('fr-FR')}`
          : '—',
      };
    });
  }

  private mapContrats(items: any[], carMap: Record<number, string>): Notif[] {
    return items.filter(i => i.dateFin).map(i => {
      const days       = this.daysBetween(i.dateFin);
      const clientName = i.clientNom || i.clientPrenom
        ? `${i.clientPrenom || ''} ${i.clientNom || ''}`.trim()
        : (i.client?.nom ? `${i.client.prenom || ''} ${i.client.nom}`.trim() : null);
      const carLabel   = carMap[i.voitureId] || i.voitureImmatriculation
        || (i.voiture?.immatriculation ?? null) || `Car #${i.voitureId || '?'}`;
      return {
        id: i.id, source: 'contrat' as NotifSource,
        vehicleLabel: carLabel,
        vehicleId: i.voitureId,
        expiryDate: i.dateFin, daysLeft: days, status: this.statusFor(days),
        detail: clientName ? `Client: ${clientName}` : `Contract #${i.id}`,
      };
    });
  }

  private mapVidanges(reminders: any): Notif[] {
    if (!reminders) return [];
    const actionable: any[] = [
      ...(reminders.overdue ?? []).map((i: any) => ({ ...i, oilStatus: 'OVERDUE'  })),
      ...(reminders.dueSoon ?? []).map((i: any) => ({ ...i, oilStatus: 'DUE_SOON' })),
    ];
    return actionable.map(i => {
      const km: number   = i.remainingKm as number;
      const status: NotifStatus = km <= 0 ? 'expired' : 'critical';
      const detail = km <= 0
        ? `Oil change overdue by ${Math.abs(km).toLocaleString()} km`
        : `Oil change due in ${km.toLocaleString()} km`;
      return {
        id: i.vidangeId,
        source: 'vidange' as NotifSource,
        vehicleLabel: `${i.voiture} (${i.immatriculation || ''})`.trim(),
        vehicleId: i.voitureId,
        expiryDate: i.lastDate || '',
        daysLeft: 0, status, detail, kmLeft: km, isKmBased: true,
      };
    });
  }

  private loadAllCars(): Observable<any[]> {
    return this.crud.getAll('voiture', { limit: 100, page: 1 }).pipe(
      switchMap((r: any) => {
        const first: any[] = Array.isArray(r) ? r : (r?.data ?? []);
        const pages: number = r?.meta?.pages ?? 1;
        if (pages <= 1) return of(first);
        const rest$ = Array.from({ length: pages - 1 }, (_, i) =>
          this.crud.getAll('voiture', { limit: 100, page: i + 2 }).pipe(
            map((p: any) => Array.isArray(p) ? p : (p?.data ?? [])),
            catchError(() => of([]))
          )
        );
        return forkJoin(rest$).pipe(map((chunks: any[][]) => first.concat(...chunks)));
      }),
      catchError(() => of([]))
    );
  }

  private toArr(r: any): any[] { return Array.isArray(r) ? r : (r?.data ?? []); }
}
