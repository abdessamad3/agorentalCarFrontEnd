import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BtnVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'icon-view' | 'icon-edit' | 'icon-delete';
export type BtnSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-btn',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './btn.component.html',
  styleUrls: ['./btn.component.css']
})
export class BtnComponent {
  @Input() variant: BtnVariant = 'primary';
  @Input() size: BtnSize = 'md';
  @Input() disabled = false;
  @Input() isLoading = false;
  @Input() title = '';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  get isIcon(): boolean { return this.variant.startsWith('icon-'); }

  get cls(): string { return `app-btn v-${this.variant} s-${this.size}`; }
}
