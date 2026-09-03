import { Pipe, PipeTransform } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { getStatusLabel, getStatusClass } from '../utils/status.utils';

@Pipe({ name: 'appStatus', standalone: true, pure: false })
export class StatusPipe implements PipeTransform {
  constructor(private ts: TranslationService) {}

  transform(value: string | null | undefined, domain: string, mode: 'label' | 'class' = 'label'): string {
    if (mode === 'class') return getStatusClass(domain, value);
    const lang = this.ts.getCurrentLanguage ? this.ts.getCurrentLanguage() : 'fr';
    return getStatusLabel(domain, value, lang);
  }
}
