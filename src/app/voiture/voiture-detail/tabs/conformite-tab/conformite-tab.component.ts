import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../../services/translation.service';
import { InsuranceTabComponent } from '../insurance-tab/insurance-tab.component';
import { VignetteTabComponent }  from '../vignette-tab/vignette-tab.component';
import { SuiviTabComponent }     from '../suivi-tab/suivi-tab.component';
import { daysUntil as daysUntilUtil } from '../../../../shared/utils/date.utils';
import { complianceSeverity as complianceSeverityUtil } from '../../../../shared/utils/compliance.utils';

@Component({
  selector: 'app-conformite-tab',
  standalone: true,
  imports: [CommonModule, InsuranceTabComponent, VignetteTabComponent, SuiviTabComponent],
  templateUrl: './conformite-tab.component.html',
  styleUrls: ['../../voiture-detail.component.css'],
})
export class ConformiteTabComponent implements OnChanges {
  @Input() carId!: number;
  @Input() car!: any;
  @Input() dir = 'ltr';
  @Output() carRefresh = new EventEmitter<void>();

  selectedSection = 'insurance';

  readonly SECTIONS = [
    { value: 'insurance', labelKey: 'assurances',   icon: '🛡️', color: '#2563eb', bg: '#eff6ff' },
    { value: 'vignettes', labelKey: 'vignettes',    icon: '📄', color: '#d97706', bg: '#fffbeb' },
    { value: 'suivi',     labelKey: 'technicalDoc', icon: '🔬', color: '#475569', bg: '#f8fafc' },
  ];

  constructor(private ts: TranslationService) {}

  ngOnChanges(_changes: SimpleChanges): void {}

  t(key: string): string { return this.ts.translate(key); }

  daysUntil(d?: string | null): number | null { return daysUntilUtil(d); }

  get compliance(): any { return this.car?.compliance ?? {}; }

  kpiLevel(status: string): 'ok' | 'warning' | 'danger' {
    if ((status || '').toUpperCase() === 'NOT_REQUIRED') return 'ok';
    const sev = complianceSeverityUtil(status);
    if (sev === 'ok') return 'ok';
    if (sev === 'warning') return 'warning';
    return 'danger'; // critical, expired, unknown
  }

  get insLevel():   'ok' | 'warning' | 'danger' { return this.kpiLevel(this.compliance.assurance?.status); }
  get vigLevel():   'ok' | 'warning' | 'danger' { return this.kpiLevel(this.compliance.vignette?.status);  }
  get suiviLevel(): 'ok' | 'warning' | 'danger' { return this.kpiLevel(this.compliance.visite?.status);   }

  get overallScore(): number {
    // Mirrors backend ComplianceService::worstStatus() — excludes NOT_REQUIRED sections.
    const sections = [
      { level: this.insLevel,   status: this.compliance.assurance?.status },
      { level: this.vigLevel,   status: this.compliance.vignette?.status },
      { level: this.suiviLevel, status: this.compliance.visite?.status },
    ].filter(s => (s.status || '').toLowerCase() !== 'not_required');
    if (sections.length === 0) return 100;
    return Math.round((sections.filter(s => s.level === 'ok').length / sections.length) * 100);
  }

  get overallScoreClass(): string {
    if (this.overallScore === 100) return 'ekc-green';
    if (this.overallScore >= 66)   return 'ekc-orange';
    return 'ekc-danger';
  }

  levelCardClass(level: 'ok' | 'warning' | 'danger'): string {
    if (level === 'ok')      return 'ekc-green';
    if (level === 'warning') return 'ekc-orange';
    return 'ekc-danger';
  }

  levelIcon(level: 'ok' | 'warning' | 'danger'): string {
    if (level === 'ok') return '✓';
    if (level === 'warning') return '⚠';
    return '✗';
  }

  expiryLabel(expiresAt: string | undefined): string {
    const days = this.daysUntil(expiresAt);
    if (days === null) return '—';
    if (days < 0)  return `${this.t('expired')} ${Math.abs(days)}j`;
    if (days === 0) return this.t('today');
    return `${days}j`;
  }
}
