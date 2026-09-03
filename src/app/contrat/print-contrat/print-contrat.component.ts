import {
  Component, Input, Output, EventEmitter,
  ViewEncapsulation, OnChanges, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyService } from '../../services/company.service';
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

  constructor(private companySvc: CompanyService) {}

  ngOnChanges(): void {
    if (this.contractData) {
      document.body.classList.add('pct-print-ready');
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

  get bureauAdresse(): string   { return this.companySvc.getCurrentBureauAdresse(); }
  get bureauTelephone(): string { return this.companySvc.getCurrentBureauTelephone(); }
  get logoUrl(): string | null  { return this.companySvc.getCurrentLogo(); }
  get companyName(): string     { return this.companySvc.getCurrentName(); }

  private readonly fuelMap: Record<string, number> = {
    vide: 0, quart: 0.25, moitie: 0.5, trois_quarts: 0.75, plein: 1
  };

  private readonly carZones: Record<string, { cx: number; cy: number }> = {
    front:      { cx: 110, cy: 165 },
    rear:       { cx: 690, cy: 165 },
    left:       { cx: 400, cy:  72 },
    right:      { cx: 400, cy: 258 },
    windshield: { cx: 220, cy: 120 },
    roof:       { cx: 400, cy: 145 },
  };

  carZoneCenter(zone: string): { cx: number; cy: number } {
    return this.carZones[zone] ?? { cx: 400, cy: 165 };
  }

  get deliveryDamages(): any[] {
    return this.delivery?.damages ?? [];
  }

  get fuelNeedle(): { x2: number; y2: number } {
    const key = this.delivery?.fuelLevelOut ?? 'vide';
    const f = this.fuelMap[key] ?? 0;
    const theta = (1 - f) * Math.PI;
    return {
      x2: Math.round(100 + 72 * Math.cos(theta)),
      y2: Math.round(105 - 72 * Math.sin(theta))
    };
  }

  get fuelBoxCount(): number {
    const key = this.delivery?.fuelLevelOut;
    const f = key ? (this.fuelMap[key] ?? 0) : 0;
    return Math.round(f * 5);
  }
}
