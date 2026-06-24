import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

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
    if (this.status === 'NOT_REQUIRED') return `${this.label}: Non requise`;
    if (this.status === 'UNKNOWN') return `${this.label}: aucun document`;
    if (this.status === 'EXPIRED') return `${this.label}: expiré`;
    if (this.status === 'UPCOMING') return `${this.label}: débute dans ${this.daysRemaining}j`;
    if (this.daysRemaining !== null) return `${this.label}: ${this.daysRemaining}j`;
    return this.label;
  }
}
