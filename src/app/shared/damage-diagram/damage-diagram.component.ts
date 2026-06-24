import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type DamageZone = 'front' | 'rear' | 'left' | 'right' | 'roof' | 'windshield';
export interface Damage { zone: DamageZone; note: string; }

const ZONE_META: Record<DamageZone, { cx: number; cy: number; label: string }> = {
  front:      { cx: 200, cy: 35,  label: 'Avant' },
  rear:       { cx: 200, cy: 185, label: 'Arrière' },
  left:       { cx: 75,  cy: 110, label: 'Gauche' },
  right:      { cx: 325, cy: 110, label: 'Droite' },
  windshield: { cx: 200, cy: 65,  label: 'Pare-brise' },
  roof:       { cx: 200, cy: 110, label: 'Toit' },
};

@Component({
  selector: 'app-damage-diagram',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './damage-diagram.component.html',
  styleUrls: ['./damage-diagram.component.css']
})
export class DamageDiagramComponent {
  @Input() damages: Damage[] = [];
  @Input() readonly = false;
  @Output() damagesChange = new EventEmitter<Damage[]>();

  pendingZone: DamageZone | null = null;
  pendingNote = '';
  showPopup = false;
  popupX = 0;
  popupY = 0;

  readonly zones = Object.keys(ZONE_META) as DamageZone[];

  onZoneClick(zone: DamageZone, event: MouseEvent) {
    if (this.readonly) return;
    const rect = (event.currentTarget as SVGElement).closest('.diagram-wrap')!.getBoundingClientRect();
    this.popupX = event.clientX - rect.left + 8;
    this.popupY = event.clientY - rect.top + 8;
    this.pendingZone = zone;
    this.pendingNote = '';
    this.showPopup = true;
  }

  confirmDamage() {
    if (!this.pendingNote.trim() || !this.pendingZone) return;
    const updated = [...this.damages, { zone: this.pendingZone, note: this.pendingNote.trim() }];
    this.damagesChange.emit(updated);
    this.showPopup = false;
    this.pendingZone = null;
    this.pendingNote = '';
  }

  cancelDamage() {
    this.showPopup = false;
    this.pendingZone = null;
    this.pendingNote = '';
  }

  removeDamage(i: number) {
    const updated = this.damages.filter((_, idx) => idx !== i);
    this.damagesChange.emit(updated);
  }

  zoneCenter(zone: string): { cx: number; cy: number } {
    return ZONE_META[zone as DamageZone] ?? { cx: 200, cy: 110 };
  }

  zoneLabel(zone: string): string {
    return ZONE_META[zone as DamageZone]?.label ?? zone;
  }
}
