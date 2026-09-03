import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-compliance-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compliance-badge.component.html',
  styleUrls: ['./compliance-badge.component.css']
})
export class ComplianceBadgeComponent {
  @Input() status: 'VALID' | 'WARNING' | 'CRITICAL' | 'EXPIRED' | 'UPCOMING' | 'UNKNOWN' | 'NOT_REQUIRED' = 'UNKNOWN';
  @Input() daysRemaining: number | null = null;
  @Input() label = '';

  constructor(private ts: TranslationService) {}

  get icon(): string {
    switch (this.status) {
      case 'VALID':         return '✓';
      case 'WARNING':       return '⚠';
      case 'CRITICAL':      return '⚠';
      case 'EXPIRED':       return '✕';
      case 'UPCOMING':      return '◷';
      case 'NOT_REQUIRED':  return '○';
      default:              return '—';
    }
  }

  get tooltip(): string {
    const lang = this.ts.getCurrentLanguage() as 'fr' | 'en' | 'ar';
    const days = this.daysRemaining;
    if (this.status === 'NOT_REQUIRED') {
      const s = { fr: 'Non requise', en: 'Not required', ar: 'غير مطلوب' };
      return `${this.label}: ${s[lang] ?? s['fr']}`;
    }
    if (this.status === 'UNKNOWN') {
      const s = { fr: 'aucun document', en: 'no document', ar: 'لا وثيقة' };
      return `${this.label}: ${s[lang] ?? s['fr']}`;
    }
    if (this.status === 'EXPIRED') {
      const s = { fr: 'expiré', en: 'expired', ar: 'منتهي الصلاحية' };
      return `${this.label}: ${s[lang] ?? s['fr']}`;
    }
    if (this.status === 'UPCOMING') {
      const d = days ?? 0;
      return lang === 'ar' ? `${this.label}: يبدأ خلال ${d}أ`
           : lang === 'fr' ? `${this.label}: débute dans ${d}j`
           : `${this.label}: starts in ${d}d`;
    }
    if (days !== null) {
      return lang === 'ar' ? `${this.label}: ${days}أ`
           : lang === 'fr' ? `${this.label}: ${days}j`
           : `${this.label}: ${days}d`;
    }
    return this.label;
  }
}
