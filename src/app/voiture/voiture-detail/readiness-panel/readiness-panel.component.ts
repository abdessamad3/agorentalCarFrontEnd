import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { complianceSeverity as complianceSeverityUtil } from '../../../shared/utils/compliance.utils';

interface ReadinessItem {
  label: string;
  points: number;
  passed: boolean;
  blocking: boolean;
  advisory: boolean;
  category: string;
}

interface ReadinessCategory {
  key: string;
  label: string;
  score: number;
  max: number;
  items: ReadinessItem[];
}

@Component({
  selector: 'app-readiness-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="rp-wrap">

  <!-- Score ring + summary -->
  <div class="rp-header">
    <div class="rp-ring-wrap" [ngClass]="ringClass">
      <svg viewBox="0 0 36 36" class="rp-svg" width="72" height="72">
        <circle class="rp-track" cx="18" cy="18" r="15.9155" fill="none" stroke-width="2.8"/>
        <circle class="rp-fill"  cx="18" cy="18" r="15.9155" fill="none" stroke-width="2.8"
                [attr.stroke-dasharray]="score + ' 100'"
                stroke-dashoffset="25" stroke-linecap="round"/>
      </svg>
      <div class="rp-ring-inner">
        <span class="rp-num">{{ score }}</span>
        <span class="rp-pct">%</span>
      </div>
    </div>

    <div class="rp-summary">
      <div class="rp-title">Préparation véhicule</div>
      <div class="rp-rating" [ngClass]="ringClass">{{ ratingLabel }}</div>

      <div class="rp-cat-bars">
        <div *ngFor="let cat of categories" class="rp-cat-row">
          <span class="rp-cat-name">{{ cat.label }}</span>
          <div class="rp-bar-track">
            <div class="rp-bar-fill"
                 [ngClass]="catBarClass(cat)"
                 [style.width.%]="(cat.score / cat.max) * 100"></div>
          </div>
          <span class="rp-cat-pts" [ngClass]="catBarClass(cat)">{{ cat.score }}/{{ cat.max }}</span>
          <button *ngIf="cat.score < cat.max" class="rp-cat-act"
            (click)="onCatAction(cat.key, hasExistingDoc(cat.key) ? 'renew' : 'add')"
            [title]="hasExistingDoc(cat.key) ? 'Renouveler' : 'Ajouter'">
            <ng-container *ngIf="hasExistingDoc(cat.key)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><polyline points="9 18 15 12 9 6"/></svg>
            </ng-container>
            <ng-container *ngIf="!hasExistingDoc(cat.key)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </ng-container>
          </button>
          <span *ngIf="cat.score >= cat.max" class="rp-cat-done">✓</span>
        </div>
      </div>

      <!-- Inspection note -->
      <div *ngIf="!inspectionRequired" class="rp-inspection-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11">
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        Visite technique non requise — véhicule de {{ vehicleAge }} an{{ vehicleAge !== 1 ? 's' : '' }}
      </div>
    </div>
  </div>

  <!-- Blocking issues -->
  <div class="rp-blockers" *ngIf="blockers.length > 0">
    <div class="rp-blockers-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      Problèmes bloquants ({{ blockers.length }})
    </div>
    <ul class="rp-issue-list">
      <li *ngFor="let b of blockers" class="rp-issue rp-issue-block">
        <span class="rp-issue-dot rp-dot-red"></span>
        {{ b.label }}
      </li>
    </ul>
  </div>

  <!-- Warnings -->
  <div class="rp-warnings" *ngIf="warnings.length > 0">
    <ul class="rp-issue-list">
      <li *ngFor="let w of warnings" class="rp-issue rp-issue-warn">
        <span class="rp-issue-dot rp-dot-amber"></span>
        {{ w.label }}
      </li>
    </ul>
  </div>

  <!-- Checklist detail -->
  <details class="rp-checklist-details">
    <summary class="rp-checklist-toggle">Show full checklist</summary>
    <div class="rp-checklist">
      <ng-container *ngFor="let cat of categories">
        <div class="rp-cl-cat">{{ cat.label }} ({{ cat.max }} pts)</div>
        <div *ngFor="let item of cat.items" class="rp-cl-item"
             [class.rp-cl-pass]="item.passed && !item.advisory"
             [class.rp-cl-partial]="item.passed && item.advisory"
             [class.rp-cl-block]="!item.passed && item.blocking"
             [class.rp-cl-warn]="!item.passed && item.advisory && !item.blocking">
          <span class="rp-cl-icon">
            <ng-container *ngIf="item.passed && !item.advisory">✓</ng-container>
            <ng-container *ngIf="item.passed && item.advisory">▲</ng-container>
            <ng-container *ngIf="!item.passed && item.blocking">✗</ng-container>
            <ng-container *ngIf="!item.passed && item.advisory && !item.blocking">▲</ng-container>
          </span>
          <span class="rp-cl-label">{{ item.label }}</span>
          <span class="rp-cl-pts">+{{ item.points }}</span>
        </div>
      </ng-container>
    </div>
  </details>

</div>
  `,
  styles: [`
.rp-wrap {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E8EEFA;
  box-shadow: 0 1px 3px rgba(11,45,78,0.08);
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.rp-header { display: flex; gap: 1.25rem; align-items: flex-start; }

.rp-ring-wrap { position: relative; width: 72px; height: 72px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.rp-svg { position: absolute; top: 0; left: 0; transform: rotate(-90deg); }
.rp-track { stroke: #EDF2F7; }
.rp-ring-wrap.rp-red    .rp-fill { stroke: #EB5757; }
.rp-ring-wrap.rp-amber  .rp-fill { stroke: #F2994A; }
.rp-ring-wrap.rp-blue   .rp-fill { stroke: #2F80ED; }
.rp-ring-wrap.rp-green  .rp-fill { stroke: #27AE60; }
.rp-ring-inner { position: relative; z-index: 1; text-align: center; line-height: 1; }
.rp-num { font-size: 1.25rem; font-weight: 700; color: #1A202C; }
.rp-pct { font-size: 0.65rem; color: #718096; }

.rp-summary { flex: 1; min-width: 0; }
.rp-title { font-size: 0.8rem; font-weight: 600; color: #4A5568; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
.rp-rating { font-size: 0.95rem; font-weight: 700; margin-bottom: 0.75rem; }
.rp-rating.rp-red   { color: #EB5757; }
.rp-rating.rp-amber { color: #F2994A; }
.rp-rating.rp-blue  { color: #2F80ED; }
.rp-rating.rp-green { color: #27AE60; }

.rp-cat-bars { display: flex; flex-direction: column; gap: 0.35rem; }
.rp-cat-row { display: flex; align-items: center; gap: 0.5rem; }
.rp-cat-name { font-size: 0.72rem; color: #718096; width: 110px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rp-bar-track { flex: 1; height: 5px; background: #EDF2F7; border-radius: 99px; overflow: hidden; }
.rp-bar-fill { height: 100%; border-radius: 99px; transition: width 0.4s ease; background: #2F80ED; }
.rp-bar-fill.cat-full    { background: #27AE60; }
.rp-bar-fill.cat-partial { background: #F2994A; }
.rp-bar-fill.cat-empty   { background: #EB5757; }
.rp-cat-pts { font-size: 0.7rem; font-weight: 600; color: #4A5568; width: 36px; text-align: right; }
.rp-cat-pts.cat-full    { color: #27AE60; }
.rp-cat-pts.cat-partial { color: #F2994A; }
.rp-cat-pts.cat-empty   { color: #EB5757; }

.rp-inspection-note {
  display: flex; align-items: center; gap: 0.35rem;
  margin-top: 0.5rem; font-size: 0.72rem; color: #718096; font-style: italic;
}

.rp-blockers-title { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; font-weight: 600; color: #EB5757; margin-bottom: 0.4rem; }
.rp-issue-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.rp-issue { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; }
.rp-issue-block { color: #C53030; }
.rp-issue-warn  { color: #975A16; }
.rp-issue-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.rp-dot-red   { background: #EB5757; }
.rp-dot-amber { background: #F2994A; }

.rp-checklist-details { border-top: 1px solid #EDF2F7; padding-top: 0.75rem; }
.rp-checklist-toggle { font-size: 0.78rem; color: #2F80ED; cursor: pointer; font-weight: 500; list-style: none; }
.rp-checklist-toggle::-webkit-details-marker { display: none; }
.rp-checklist { margin-top: 0.6rem; display: flex; flex-direction: column; gap: 0; }
.rp-cl-cat { font-size: 0.7rem; font-weight: 700; color: #A0AEC0; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 0.6rem; margin-bottom: 0.25rem; padding-left: 0.25rem; }
.rp-cl-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0.25rem; border-radius: 6px; font-size: 0.8rem; }
.rp-cl-item:hover { background: #F7FAFC; }
.rp-cl-pass    .rp-cl-icon { color: #27AE60; font-weight: 700; width: 14px; }
.rp-cl-partial .rp-cl-icon { color: #F2994A; font-weight: 700; width: 14px; }
.rp-cl-block   .rp-cl-icon { color: #EB5757; font-weight: 700; width: 14px; }
.rp-cl-warn    .rp-cl-icon { color: #F2994A; font-weight: 700; width: 14px; }
.rp-cl-pass    { color: #2D3748; }
.rp-cl-partial { color: #975A16; }
.rp-cl-block   { color: #C53030; }
.rp-cl-warn    { color: #975A16; }
.rp-cl-label { flex: 1; }
.rp-cl-pts { font-size: 0.72rem; color: #A0AEC0; margin-left: auto; }
.rp-cl-pass    .rp-cl-pts { color: #27AE60; }
.rp-cl-partial .rp-cl-pts { color: #F2994A; }
.rp-cat-act {
  width: 20px; height: 20px; border-radius: 4px; border: 1px solid #E2E8F0;
  background: white; cursor: pointer; display: flex; align-items: center;
  justify-content: center; color: #2F80ED; transition: all 0.15s; padding: 0; flex-shrink: 0;
}
.rp-cat-act:hover { background: #EBF5FF; border-color: #2F80ED; }
.rp-cat-done { font-size: 0.7rem; color: #27AE60; font-weight: 700; width: 20px; text-align: center; flex-shrink: 0; }
  `]
})
export class ReadinessPanelComponent implements OnChanges {
  @Input() car: any;
  @Input() compliance: any;
  @Input() vidanges: any[] = [];
  @Input() hasPhoto = false;
  @Output() actionClick = new EventEmitter<string>();

  categories: ReadinessCategory[] = [];
  score = 0;
  inspectionRequired = false;
  vehicleAge = 0;

  assuranceStatus: string | undefined;
  vignetteStatus:  string | undefined;
  visiteStatus:    string | undefined;

  ngOnChanges(): void {
    this.build();
  }

  private build(): void {
    const c = this.car;
    const comp = this.compliance;
    const currentYear = new Date().getFullYear();
    const vehicleYear = +(c?.annee || currentYear);
    this.vehicleAge = currentYear - vehicleYear;
    this.inspectionRequired = this.vehicleAge >= 3;

    // Use shared severity classifier: ok/warning = pass, critical/expired/neutral = fail
    const compPass = (status: string | undefined): boolean => {
      const sev = complianceSeverityUtil(status);
      return sev === 'ok' || sev === 'warning';
    };

    this.assuranceStatus = comp?.assurance?.status;
    this.vignetteStatus  = comp?.vignette?.status;
    this.visiteStatus    = comp?.visite?.status;

    const assuranceStatus = this.assuranceStatus;
    const vignetteStatus  = this.vignetteStatus;
    const visiteStatus    = this.visiteStatus;

    const assuranceOk = compPass(assuranceStatus);
    const vignetteOk  = compPass(vignetteStatus);
    const visiteOk    = compPass(visiteStatus);

    // ── Configuration (max 20) ──────────────────────────────────
    const configItems: ReadinessItem[] = [
      {
        label: 'Identité véhicule (marque, modèle, année, carburant)',
        points: 5,
        passed: !!(c?.marque && c?.modele && c?.annee && c?.typeCarburant),
        blocking: false, advisory: false, category: 'config',
      },
      {
        label: 'Plaque d\'immatriculation assignée',
        points: 7,
        passed: !!(c?.immatriculation),
        blocking: true, advisory: false, category: 'config',
      },
      {
        label: 'Couleur, places, portes renseignés',
        points: 4,
        passed: !!(c?.couleur && c?.places && c?.portes),
        blocking: false, advisory: false, category: 'config',
      },
      {
        label: 'Photos du véhicule téléchargées',
        points: 4,
        passed: this.hasPhoto,
        blocking: false, advisory: true, category: 'config',
      },
    ];

    // ── Insurance (max 25) ──────────────────────────────────────
    const assuranceDays: number | null = comp?.assurance?.daysRemaining ?? null;
    const assuranceSev   = complianceSeverityUtil(assuranceStatus);
    const assuranceCrit  = assuranceSev === 'danger' && assuranceDays !== null && assuranceDays >= 0;
    const assuranceExp   = assuranceSev === 'danger' && (assuranceDays === null || assuranceDays < 0);
    const insuranceItems: ReadinessItem[] = [
      {
        label: assuranceOk
          ? `Assurance valide — expire le ${this.fmtDate(comp?.assurance?.expiresAt)}`
          : assuranceCrit
            ? `Assurance en expiration imminente — ${assuranceDays}j`
            : assuranceExp
              ? 'Assurance expirée'
              : 'Assurance manquante',
        points:   25,
        passed:   assuranceOk,
        blocking: assuranceExp || assuranceSev === 'neutral',
        advisory: assuranceCrit,
        category: 'insurance',
      },
    ];

    // ── Vignette (max 20) ────────────────────────────────────────
    const vignetteDays: number | null = comp?.vignette?.daysRemaining ?? null;
    const vignetteSev   = complianceSeverityUtil(vignetteStatus);
    const vignetteCrit  = vignetteSev === 'danger' && vignetteDays !== null && vignetteDays >= 0;
    const vignetteExp   = vignetteSev === 'danger' && (vignetteDays === null || vignetteDays < 0);
    const vignetteItems: ReadinessItem[] = [
      {
        label: vignetteOk
          ? `Vignette valide — ${currentYear}`
          : vignetteCrit
            ? `Vignette en expiration imminente — ${vignetteDays}j`
            : vignetteExp
              ? 'Vignette expirée'
              : 'Vignette manquante',
        points:   20,
        passed:   vignetteOk,
        blocking: vignetteExp || vignetteSev === 'neutral',
        advisory: vignetteCrit,
        category: 'vignette',
      },
    ];

    // ── Inspection (max 15, only if age >= 3) ───────────────────
    const visiteDays: number | null = comp?.visite?.daysRemaining ?? null;
    const visiteSev   = complianceSeverityUtil(visiteStatus);
    const visiteCrit  = visiteSev === 'danger' && visiteDays !== null && visiteDays >= 0;
    const visiteExp   = visiteSev === 'danger' && (visiteDays === null || visiteDays < 0);
    const inspectionItems: ReadinessItem[] = this.inspectionRequired ? [
      {
        label: visiteOk
          ? `Visite technique valide — expire le ${this.fmtDate(comp?.visite?.expiresAt)}`
          : visiteCrit
            ? `Visite technique en expiration imminente — ${visiteDays}j`
            : visiteExp
              ? `Visite technique expirée (véhicule de ${this.vehicleAge} ans)`
              : `Visite technique manquante (véhicule de ${this.vehicleAge} ans)`,
        points:   15,
        passed:   visiteOk,
        blocking: visiteExp || visiteSev === 'neutral',
        advisory: visiteCrit,
        category: 'inspection',
      },
    ] : [];

    // ── Pricing (max 10) ────────────────────────────────────────
    const pricingItems: ReadinessItem[] = [
      {
        label: 'Prix journalier configuré',
        points: 7,
        passed: +(c?.prixJour || 0) > 0,
        blocking: true, advisory: false, category: 'pricing',
      },
      {
        label: 'Caution configurée',
        points: 3,
        passed: c?.caution !== null && c?.caution !== undefined,
        blocking: false, advisory: true, category: 'pricing',
      },
    ];

    // ── Mileage (max 10) ────────────────────────────────────────
    const mileageItems: ReadinessItem[] = [
      {
        label: 'Kilométrage actuel enregistré',
        points: 10,
        passed: +(c?.kilometrageActuel || 0) > 0,
        blocking: true, advisory: false, category: 'mileage',
      },
    ];

    // Build categories
    this.categories = [
      { key: 'config',     label: 'Configuration',   score: this.sum(configItems),     max: 20, items: configItems },
      { key: 'insurance',  label: 'Assurance',        score: this.sum(insuranceItems),  max: 25, items: insuranceItems },
      { key: 'vignette',   label: 'Vignette',         score: this.sum(vignetteItems),   max: 20, items: vignetteItems },
      ...(this.inspectionRequired ? [{ key: 'inspection', label: 'Visite technique', score: this.sum(inspectionItems), max: 15, items: inspectionItems }] : []),
      { key: 'pricing',    label: 'Tarification',     score: this.sum(pricingItems),    max: 10, items: pricingItems },
      { key: 'mileage',    label: 'Kilométrage',      score: this.sum(mileageItems),    max: 10, items: mileageItems },
    ];

    // Normalize: total max changes if inspection not required
    const totalMax = 20 + 25 + 20 + (this.inspectionRequired ? 15 : 0) + 10 + 10;
    const earned = this.categories.reduce((t, cat) => t + cat.score, 0);
    this.score = Math.min(100, Math.round((earned / totalMax) * 100));
  }

  private sum(items: ReadinessItem[]): number {
    return items.filter(i => i.passed).reduce((t, i) => t + i.points, 0);
  }

  private fmtDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  get blockers(): ReadinessItem[] {
    return this.categories.flatMap(c => c.items).filter(i => !i.passed && i.blocking);
  }

  get warnings(): ReadinessItem[] {
    return this.categories.flatMap(c => c.items).filter(i => i.advisory);
  }

  get ringClass(): string {
    if (this.score >= 100) return 'rp-green';
    if (this.score >= 70)  return 'rp-blue';
    if (this.score >= 40)  return 'rp-amber';
    return 'rp-red';
  }

  get ratingLabel(): string {
    if (this.score >= 100) return 'Prêt pour la location';
    if (this.score >= 70)  return 'Presque prêt';
    if (this.score >= 40)  return 'Configuration en cours';
    return 'Non prêt';
  }

  catBarClass(cat: ReadinessCategory): string {
    const pct = cat.score / cat.max;
    if (pct >= 1)   return 'cat-full';
    if (pct >= 0.5) return 'cat-partial';
    return 'cat-empty';
  }

  hasExistingDoc(catKey: string): boolean {
    const expiresMap: Record<string, string | null | undefined> = {
      insurance:  this.compliance?.assurance?.expiresAt,
      vignette:   this.compliance?.vignette?.expiresAt,
      inspection: this.compliance?.visite?.expiresAt,
    };
    return !!expiresMap[catKey];
  }

  onCatAction(key: string, mode: 'add' | 'renew' = 'add'): void {
    const addMap: Record<string, string> = {
      config:     'edit-vehicle',
      insurance:  'add-insurance',
      vignette:   'add-vignette',
      inspection: 'add-inspection',
      pricing:    'edit-vehicle',
      mileage:    'edit-vehicle',
    };
    const renewMap: Record<string, string> = {
      config:     'edit-vehicle',
      insurance:  'renew-insurance',
      vignette:   'renew-vignette',
      inspection: 'renew-inspection',
      pricing:    'edit-vehicle',
      mileage:    'edit-vehicle',
    };
    this.actionClick.emit(mode === 'renew' ? (renewMap[key] ?? key) : (addMap[key] ?? key));
  }
}
