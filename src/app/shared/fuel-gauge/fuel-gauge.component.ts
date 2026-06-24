import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fuel-gauge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fuel-gauge.component.html',
  styleUrls: ['./fuel-gauge.component.css']
})
export class FuelGaugeComponent {
  @Input() value = 'vide';
  @Input() readonly = false;
  @Output() valueChange = new EventEmitter<string>();

  readonly levels = [
    { key: 'vide',         label: 'E' },
    { key: 'quart',        label: '¼' },
    { key: 'moitie',       label: '½' },
    { key: 'trois_quarts', label: '¾' },
    { key: 'plein',        label: 'F' },
  ];

  select(key: string) {
    if (this.readonly) return;
    this.value = key;
    this.valueChange.emit(key);
  }
}
