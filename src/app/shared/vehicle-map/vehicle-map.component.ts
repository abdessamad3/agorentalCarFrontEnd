import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../services/translation.service';

export const VEHICLE_ZONES = [
  { value: 'front_bumper',  key: 'zoneFrontBumper' },
  { value: 'hood',          key: 'zoneHood' },
  { value: 'windshield',    key: 'zoneWindshield' },
  { value: 'roof',          key: 'zoneRoof' },
  { value: 'rear_window',   key: 'zoneRearWindow' },
  { value: 'trunk',         key: 'zoneTrunk' },
  { value: 'rear_bumper',   key: 'zoneRearBumper' },
  { value: 'fl_fender',     key: 'zoneFlFender' },
  { value: 'fr_fender',     key: 'zoneFrFender' },
  { value: 'rl_fender',     key: 'zoneRlFender' },
  { value: 'rr_fender',     key: 'zoneRrFender' },
  { value: 'fl_door',       key: 'zoneFlDoor' },
  { value: 'fr_door',       key: 'zoneFrDoor' },
  { value: 'rl_door',       key: 'zoneRlDoor' },
  { value: 'rr_door',       key: 'zoneRrDoor' },
  { value: 'left_mirror',   key: 'zoneLeftMirror' },
  { value: 'right_mirror',  key: 'zoneRightMirror' },
  { value: 'fl_wheel',      key: 'zoneFlWheel' },
  { value: 'fr_wheel',      key: 'zoneFrWheel' },
  { value: 'rl_wheel',      key: 'zoneRlWheel' },
  { value: 'rr_wheel',      key: 'zoneRrWheel' },
];

@Component({
  selector: 'app-vehicle-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vehicle-map.component.html',
  styleUrls: ['./vehicle-map.component.css'],
})
export class VehicleMapComponent {
  @Input() damagedZones: string[] = [];
  @Input() mode: 'readonly' | 'interactive' = 'readonly';
  @Output() zoneClick = new EventEmitter<string>();

  constructor(private ts: TranslationService) {}

  t(key: string): string { return this.ts.translate(key); }

  isDamaged(zone: string): boolean { return this.damagedZones.includes(zone); }

  handleClick(zone: string): void {
    if (this.mode === 'interactive') this.zoneClick.emit(zone);
  }
}
