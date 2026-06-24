import {
  Component, Input, Output, EventEmitter,
  ViewEncapsulation, OnChanges, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';

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
  @Output() closed = new EventEmitter<void>();

  ngOnChanges(): void {
    if (this.contractData) {
      document.body.classList.add('pct-print-ready');
    } else {
      document.body.classList.remove('pct-print-ready');
    }
  }

  ngOnDestroy(): void {
    document.body.classList.remove('pct-print-ready');
  }

  print(): void { window.print(); }

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
}
