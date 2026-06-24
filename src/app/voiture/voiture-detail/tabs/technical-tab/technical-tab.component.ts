import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-technical-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './technical-tab.component.html',
  styleUrls: ['../../voiture-detail.component.css'],
})
export class TechnicalTabComponent {
  @Input() car!: any;
  @Input() dir = 'ltr';

  constructor(private ts: TranslationService) {}

  fmt(v: any): string {
    if (v === null || v === undefined || v === '') return '—';
    return String(v);
  }

  t(key: string): string { return this.ts.translate(key); }
}
