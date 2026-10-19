import {
  Component, Input, Output, EventEmitter,
  ViewEncapsulation, OnChanges, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyService } from '../../services/company.service';
import { ContratService } from '../../services/contrat.service';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-print-contrat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './print-contrat.component.html',
  styleUrls: ['./print-contrat.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PrintContratComponent implements OnChanges, OnDestroy {
  @Input() contractData: any = null;
  @Input() autoDownload = false;
  @Output() closed = new EventEmitter<void>();

  private _autoTriggered = false;
  private _conditionsFetched = false;

  /** Admin-edited legal terms (Settings > Conditions du contrat). Null until loaded;
   *  the template falls back to the hardcoded articles while null or empty. */
  conditionsFr: string | null = null;
  conditionsAr: string | null = null;

  constructor(private companySvc: CompanyService, private contratSvc: ContratService) {}

  ngOnChanges(): void {
    if (this.contractData) {
      document.body.classList.add('pct-print-ready');
      if (!this._conditionsFetched) {
        this._conditionsFetched = true;
        this.contratSvc.getConditionsContrat().subscribe({
          next: (cc: any) => {
            // Only trust this once an admin has actually saved it at least once (updatedAt set) —
            // the backend auto-creates a blank row with placeholder stub text ("À compléter.") on
            // first read, which must NOT override the real legal articles below.
            if (!cc?.updatedAt) return;
            this.conditionsFr = (cc?.texteFrancais ?? '').trim() || null;
            this.conditionsAr = (cc?.texteArabe ?? '').trim() || null;
          },
          error: () => { /* keep hardcoded fallback */ }
        });
      }
      if (this.autoDownload && !this._autoTriggered) {
        this._autoTriggered = true;
        setTimeout(() => this.downloadPdf(), 200);
      }
    } else {
      document.body.classList.remove('pct-print-ready');
      this._autoTriggered = false;
    }
  }

  ngOnDestroy(): void {
    document.body.classList.remove('pct-print-ready');
  }

  downloading = false;

  print(): void { window.print(); }

  async downloadPdf(): Promise<void> {
    if (this.downloading) return;
    this.downloading = true;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const pages = Array.from(document.querySelectorAll<HTMLElement>('.pct-page'));
      if (!pages.length) return;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }

      pdf.save(`contrat-${this.contractNum || 'export'}.pdf`);
      if (this.autoDownload) this.close();
    } finally {
      this.downloading = false;
    }
  }

  close(): void {
    document.body.classList.remove('pct-print-ready');
    this.closed.emit();
  }

  v(x: any): string {
    return (x != null && x !== '') ? String(x) : '';
  }

  fmtDateTime(d: string): string {
    if (!d) return '';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('fr-FR') + '  ' +
        dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
  }

  fmtDate(d: string): string {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
  }

  get days(): number {
    const c = this.contractData;
    if (!c?.dateDebut || !c?.dateFin) return 0;
    return Math.max(1, Math.round(
      (new Date(c.dateFin).getTime() - new Date(c.dateDebut).getTime()) / 86400000
    ));
  }

  get daysLabel(): string {
    const d = this.days;
    return d ? d + ' jour' + (d > 1 ? 's' : '') : '';
  }

  get contractNum(): string {
    return this.v(this.contractData?.numeroContrat) || this.v(this.contractData?.id);
  }

  get client(): any    { return this.contractData?.client || {}; }
  get voiture(): any   { return this.contractData?.voiture || {}; }
  get delivery(): any  { return this.contractData?.vehicleDelivery ?? null; }
  get returnData(): any { return this.contractData?.vehicleReturnInspection ?? null; }
  get d2(): any        { return this.contractData?.deuxiemeChauffeur ?? {}; }

  get avance(): string {
    const p = this.contractData?.montantPaye;
    return p != null && p !== '' ? (+p).toLocaleString('fr-FR') + ' DH' : '';
  }

  get reste(): string {
    const t = this.contractData?.montantTotal;
    const p = this.contractData?.montantPaye;
    if (t == null) return '';
    return ((+t) - (+(p ?? 0))).toLocaleString('fr-FR') + ' DH';
  }

  get today(): string {
    return new Date().toLocaleDateString('fr-FR');
  }

  money(x: any): string {
    return (x != null && x !== '') ? (+x).toLocaleString('fr-FR') + ' DH' : '';
  }

  get bureauAdresse(): string   { return this.companySvc.getCurrentBureauAdresse(); }
  get bureauTelephone(): string { return this.companySvc.getCurrentBureauTelephone(); }
  get logoUrl(): string | null  { return this.companySvc.getCurrentLogo(); }
  get companyName(): string     { return this.companySvc.getCurrentName(); }

  private readonly fuelMap: Record<string, number> = {
    vide: 0, quart: 0.25, moitie: 0.5, trois_quarts: 0.75, plein: 1
  };

  // Coordinates on the print-contrat SVG (viewBox 0 0 800 330), derived from
  // app-vehicle-map's own geometry (viewBox 0 0 200 416) so markers land on the
  // actual panel that was clicked during delivery/return inspection, instead of
  // the diagram's center. front/rear/left/right/legacy keys kept for any older
  // Damage rows saved before app-vehicle-map replaced the old 6-zone picker.
  private readonly carZones: Record<string, { cx: number; cy: number }> = {
    front_bumper: { cx: 108, cy: 165 }, hood:        { cx: 191, cy: 165 },
    windshield:   { cx: 284, cy: 165 }, roof:         { cx: 389, cy: 165 },
    rear_window:  { cx: 494, cy: 165 }, trunk:        { cx: 595, cy: 165 },
    rear_bumper:  { cx: 689, cy: 165 },
    fl_fender:    { cx: 205, cy:  88 }, fr_fender:    { cx: 205, cy: 242 },
    rl_fender:    { cx: 578, cy:  88 }, rr_fender:    { cx: 578, cy: 242 },
    fl_door:      { cx: 356, cy:  88 }, fr_door:      { cx: 356, cy: 242 },
    rl_door:      { cx: 437, cy:  88 }, rr_door:      { cx: 437, cy: 242 },
    left_mirror:  { cx: 341, cy:  72 }, right_mirror: { cx: 341, cy: 258 },
    fl_wheel:     { cx: 208, cy:  68 }, fr_wheel:     { cx: 208, cy: 262 },
    rl_wheel:     { cx: 573, cy:  68 }, rr_wheel:     { cx: 573, cy: 262 },
    // Legacy (pre-vehicle-map) zone names
    front: { cx: 108, cy: 165 }, rear: { cx: 689, cy: 165 },
    left:  { cx: 400, cy:  72 }, right: { cx: 400, cy: 258 },
  };

  private readonly zoneLabels: Record<string, string> = {
    front_bumper: 'Pare-chocs avant', hood: 'Capot', windshield: 'Pare-brise',
    roof: 'Toit', rear_window: 'Lunette arrière', trunk: 'Coffre', rear_bumper: 'Pare-chocs arrière',
    fl_fender: 'Aile avant-gauche', fr_fender: 'Aile avant-droite',
    rl_fender: 'Aile arrière-gauche', rr_fender: 'Aile arrière-droite',
    fl_door: 'Portière avant-gauche', fr_door: 'Portière avant-droite',
    rl_door: 'Portière arrière-gauche', rr_door: 'Portière arrière-droite',
    left_mirror: 'Rétroviseur gauche', right_mirror: 'Rétroviseur droit',
    fl_wheel: 'Roue avant-gauche', fr_wheel: 'Roue avant-droite',
    rl_wheel: 'Roue arrière-gauche', rr_wheel: 'Roue arrière-droite',
    front: 'Avant', rear: 'Arrière', left: 'Côté gauche', right: 'Côté droit',
  };

  carZoneCenter(zone: string): { cx: number; cy: number } {
    return this.carZones[zone] ?? { cx: 400, cy: 165 };
  }

  zoneLabel(zone: string): string {
    return this.zoneLabels[zone] ?? zone;
  }

  get deliveryDamages(): any[] {
    return this.delivery?.damages ?? [];
  }

  /** Damage recorded at return (VehicleReturnInspection.damageItems) — separate set
   *  from deliveryDamages above, which only ever reflects hand-over-time damage. */
  get returnDamages(): any[] {
    return this.returnData?.damageItems ?? [];
  }

  private fuelNeedleFor(fuelLevel: string | null | undefined): { x2: number; y2: number } {
    const f = this.fuelMap[fuelLevel ?? 'vide'] ?? 0;
    const theta = (1 - f) * Math.PI;
    return {
      x2: Math.round(100 + 72 * Math.cos(theta)),
      y2: Math.round(105 - 72 * Math.sin(theta))
    };
  }

  private fuelBoxCountFor(fuelLevel: string | null | undefined): number {
    const f = fuelLevel ? (this.fuelMap[fuelLevel] ?? 0) : 0;
    return Math.round(f * 5);
  }

  get fuelNeedle(): { x2: number; y2: number } {
    return this.fuelNeedleFor(this.delivery?.fuelLevelOut);
  }

  get fuelBoxCount(): number {
    return this.fuelBoxCountFor(this.delivery?.fuelLevelOut);
  }

  /** Same gauge, keyed to the return inspection's fuel level instead of hand-over's. */
  get returnFuelNeedle(): { x2: number; y2: number } {
    return this.fuelNeedleFor(this.returnData?.fuelLevelIn);
  }

  get returnFuelBoxCount(): number {
    return this.fuelBoxCountFor(this.returnData?.fuelLevelIn);
  }

  get returnConditionLabel(): string {
    const map: Record<string, string> = {
      clean: 'Bon état / Aucun dommage',
      scratch: 'Rayure(s) constatée(s)',
      dent: 'Bosse(s) / dommage(s) constaté(s)',
      major_damage: 'Dommage(s) important(s) constaté(s)',
    };
    return map[this.returnData?.condition] ?? this.v(this.returnData?.condition);
  }
}
