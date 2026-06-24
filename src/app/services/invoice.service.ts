import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import jsPDF from 'jspdf';
import { CompanyService } from './company.service';
import { ToastService } from './toast.service';
import { environment } from '../../environments/environment';

export interface InvoiceCompany {
  name:    string;
  address: string;
  phone:   string;
  email:   string;
  ice:     string;
  logo:    string | null;
}

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private companySvc: CompanyService,
    private toast: ToastService,
  ) {}

  /** Fetch reservation details then generate and download invoice PDF */
  generateForReservation(reservationId: number): void {
    const bureauId = this.companySvc.getCurrentBureauId();
    const settings$ = bureauId
      ? this.http.get<any>(`${this.apiUrl}/parametres/${bureauId}`).pipe(catchError(() => of({})))
      : of({});

    forkJoin({
      res:      this.http.get<any>(`${this.apiUrl}/reservation/${reservationId}`),
      settings: settings$,
    }).subscribe({
      next: ({ res, settings }) => {
        const company: InvoiceCompany = {
          name:    settings.companyName || this.companySvc.getCurrentName() || 'AGOCAR',
          address: settings.adresse     || '',
          phone:   settings.phone       || '',
          email:   settings.email       || '',
          ice:     settings.ice         || '',
          logo:    this.companySvc.getCurrentLogo(),
        };
        this.buildRentalPdf(res, company);
      },
      error: () => this.toast.show('Impossible de générer la facture.', 'error'),
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  private buildRentalPdf(res: any, co: InvoiceCompany): void {
    const doc    = new jsPDF({ unit: 'mm', format: 'a4' });
    const PAGE_W = 210;
    const PAGE_H = 297;
    const MARGIN = 15;
    const COL2   = 115;
    let y        = MARGIN;

    const fmt = (d: string | null): string => {
      if (!d) return '—';
      const dt = new Date(d);
      return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const currency = (v: number | string | null): string =>
      v != null ? Number(v).toLocaleString('fr-MA', { minimumFractionDigits: 2 }) + ' MAD' : '0.00 MAD';

    // ── Header band ─────────────────────────────────────────────────────────
    doc.setFillColor(30, 41, 59);     // dark navy
    doc.rect(0, 0, PAGE_W, 30, 'F');

    // Company name
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(co.name, MARGIN, 13);

    // Invoice label (right side)
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text('FACTURE DE LOCATION', PAGE_W - MARGIN, 11, { align: 'right' });
    doc.setFontSize(9);
    doc.text(`N° ${String(res.id).padStart(6, '0')}`, PAGE_W - MARGIN, 17, { align: 'right' });
    doc.text(`Date: ${fmt(res.creeAu || new Date().toISOString())}`, PAGE_W - MARGIN, 23, { align: 'right' });

    y = 38;

    // ── Company info block ───────────────────────────────────────────────────
    doc.setTextColor(40, 40, 40); doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
    const coLines: string[] = [];
    if (co.address) coLines.push(co.address);
    if (co.phone)   coLines.push(`Tél: ${co.phone}`);
    if (co.email)   coLines.push(`Email: ${co.email}`);
    if (co.ice)     coLines.push(`ICE: ${co.ice}`);
    coLines.forEach(l => { doc.text(l, MARGIN, y); y += 5; });

    // ── Bill To block ────────────────────────────────────────────────────────
    const billY0 = 38;
    doc.setFillColor(246, 248, 252);
    doc.roundedRect(COL2, billY0 - 3, PAGE_W - COL2 - MARGIN, 36, 2, 2, 'F');

    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 120);
    doc.text('FACTURÉ À', COL2 + 3, billY0 + 2);

    const cli = res.client || {};
    const clientName = [cli.prenom, cli.nom].filter(Boolean).join(' ') || cli.nom || `Client #${res.clientId}`;
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
    doc.text(clientName, COL2 + 3, billY0 + 9);

    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
    let billRow = billY0 + 15;
    if (cli.telephone)    { doc.text(`Tél: ${cli.telephone}`,      COL2 + 3, billRow); billRow += 5; }
    if (cli.email)        { doc.text(`Email: ${cli.email}`,         COL2 + 3, billRow); billRow += 5; }
    if (cli.cin)          { doc.text(`CIN: ${cli.cin}`,             COL2 + 3, billRow); billRow += 5; }
    if (cli.permisConduite){ doc.text(`Permis: ${cli.permisConduite}`, COL2 + 3, billRow); }

    y = Math.max(y, billY0 + 39);

    // ── Divider ──────────────────────────────────────────────────────────────
    y += 4;
    doc.setDrawColor(200, 200, 215); doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 6;

    // ── Vehicle card ─────────────────────────────────────────────────────────
    const voit = res.voiture || {};
    const vehicleLabel = [voit.marque, voit.modele].filter(Boolean).join(' ') || `Véhicule #${res.voitureId}`;
    const immat = voit.immatriculation || '';
    const annee = voit.annee ? `(${voit.annee})` : '';

    doc.setFillColor(239, 246, 255);
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 18, 2, 2, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 100, 160);
    doc.text('VÉHICULE', MARGIN + 3, y + 6);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 60);
    doc.text(`${vehicleLabel} ${annee}`, MARGIN + 3, y + 13);
    if (immat) {
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 80, 140);
      doc.text(`Immatriculation: ${immat}`, PAGE_W - MARGIN - 3, y + 13, { align: 'right' });
    }
    y += 24;

    // ── Rental period ────────────────────────────────────────────────────────
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 120);
    doc.text('PÉRIODE DE LOCATION', MARGIN, y); y += 6;

    const pRow = (label: string, val: string, x: number = MARGIN) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(50, 50, 50);
      doc.text(label, x, y);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
      doc.text(val, x + 45, y);
    };

    pRow('Début:', fmt(res.dateDebut));
    pRow('Durée:', `${res.nbJours ?? 0} jour(s)`, MARGIN + 75);
    y += 6;
    pRow('Fin:', fmt(res.dateFin));
    pRow('Tarif journalier:', currency(res.prixJour), MARGIN + 75);
    y += 8;

    doc.setDrawColor(220, 220, 235); doc.setLineWidth(0.2);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;

    // ── Line items table ─────────────────────────────────────────────────────
    const TH_H   = 7;
    const COL_W  = [85, 30, 35, 35];
    const COLS   = [MARGIN, MARGIN + COL_W[0], MARGIN + COL_W[0] + COL_W[1], MARGIN + COL_W[0] + COL_W[1] + COL_W[2]];

    // Table header
    doc.setFillColor(30, 41, 59);
    doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, TH_H, 'F');
    const headers = ['Description', 'Jours', 'Prix/Jour', 'Total'];
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    headers.forEach((h, i) => {
      doc.text(h, COLS[i] + 2, y + 5);
    });
    y += TH_H;

    // Row: base rental
    const baseTotal = (res.nbJours ?? 0) * (res.prixJour ?? 0);
    const rows: [string, string, string, string][] = [
      [vehicleLabel, String(res.nbJours ?? 0), currency(res.prixJour), currency(baseTotal)],
    ];

    // Accessoires rows
    (res.accessoires || []).forEach((a: any) => {
      rows.push([`Accessoire: ${a.nom}`, '—', '—', '—']);
    });

    rows.forEach((row, idx) => {
      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 255];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 7, 'F');
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
      row.forEach((cell, i) => doc.text(cell, COLS[i] + 2, y + 5));
      y += 7;
    });

    y += 4;

    // ── Totals block ─────────────────────────────────────────────────────────
    const totW  = 80;
    const totX  = PAGE_W - MARGIN - totW;

    const totLine = (label: string, val: string, bold = false, highlight = false) => {
      if (highlight) {
        doc.setFillColor(30, 41, 59);
        doc.rect(totX, y - 1, totW, 8, 'F');
        doc.setTextColor(255, 255, 255);
      } else {
        doc.setTextColor(50, 50, 50);
      }
      doc.setFontSize(9);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(label, totX + 2, y + 5);
      doc.text(val, totX + totW - 2, y + 5, { align: 'right' });
      y += 8;
      if (!highlight) doc.setTextColor(40, 40, 40);
    };

    totLine('Sous-total:', currency(res.total));
    totLine('Montant payé:', currency(res.montantPaye));
    totLine('Reste à payer:', currency(res.montantRestant));
    totLine('TOTAL:', currency(res.total), true, true);
    y += 4;

    // ── Payment info ─────────────────────────────────────────────────────────
    if (res.modePaiement) {
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
      doc.text(`Mode de paiement: ${res.modePaiement}`, MARGIN, y); y += 6;
    }

    // ── Status badge ─────────────────────────────────────────────────────────
    const statusColors: Record<string, number[]> = {
      confirmed:   [34, 197, 94],
      pending:     [234, 179, 8],
      cancelled:   [239, 68, 68],
      terminee:    [99, 102, 241],
      in_progress: [59, 130, 246],
    };
    const statusLabels: Record<string, string> = {
      confirmed:   'Confirmée',
      pending:     'En attente',
      cancelled:   'Annulée',
      terminee:    'Terminée',
      in_progress: 'En cours',
    };
    const st = res.reservationStatus || 'confirmed';
    const sc = statusColors[st] || [100, 100, 100];
    doc.setFillColor(sc[0], sc[1], sc[2]);
    doc.roundedRect(MARGIN, y - 2, 40, 7, 2, 2, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text(statusLabels[st] || st, MARGIN + 3, y + 3);
    y += 12;

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.setDrawColor(200, 200, 215); doc.setLineWidth(0.3);
    doc.line(MARGIN, PAGE_H - 18, PAGE_W - MARGIN, PAGE_H - 18);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 140);
    doc.text('Merci pour votre confiance !', PAGE_W / 2, PAGE_H - 13, { align: 'center' });
    if (co.phone || co.email) {
      doc.text(`${co.phone}  •  ${co.email}`, PAGE_W / 2, PAGE_H - 8, { align: 'center' });
    }

    doc.save(`facture-reservation-${res.id}.pdf`);
  }
}
