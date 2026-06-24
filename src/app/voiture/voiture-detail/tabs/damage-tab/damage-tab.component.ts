import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-damage-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './damage-tab.component.html',
  styleUrls: ['../../voiture-detail.component.css'],
})
export class DamageTabComponent {
  @Input() carId!: number;
  @Input() car!: any;
  @Input() dir = 'ltr';

  constructor(private ts: TranslationService) {}

  t(key: string): string { return this.ts.translate(key); }
}
