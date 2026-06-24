import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Injectable({ providedIn: 'root' })
export class ExportService {

  // ── PDF: Reservation Receipt ─────────────────────────────────────────────

  reservationReceipt(r: any): void {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('fr-FR');

    this.header(doc, 'RESERVATION RECEIPT', `#${r.id}`, today);

    const clientName = this.clientLabel(r);
    const vehicleLabel = this.vehicleLabel(r);

    autoTable(doc, {
      startY: 50,
      head: [['CLIENT', 'VEHICLE']],
      body: [[clientName, vehicleLabel]],
      headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
      bodyStyles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 90 } },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [['RESERVATION DETAILS', '']],
      body: [
        ['Check-in',       r.dateDebut ? new Date(r.dateDebut).toLocaleDateString('fr-FR') : '—'],
        ['Check-out',      r.dateFin   ? new Date(r.dateFin).toLocaleDateString('fr-FR')   : '—'],
        ['Status',         r.reservationStatus || r.statut || '—'],
        ['Payment Method', r.modePaiement || '—'],
        ['Accessories',    this.accessoiresLabel(r)],
      ],
      headStyles: { fillColor: [52, 73, 94], fontSize: 9 },
      bodyStyles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    });

    const total     = parseFloat(r.total     || r.montant || 0);
    const paid      = parseFloat(r.montantPaye || 0);
    const remaining = Math.max(0, total - paid);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [['PAYMENT SUMMARY', '']],
      body: [
        ['Total',     this.money(total)],
        ['Paid',      this.money(paid)],
        ['Remaining', this.money(remaining)],
      ],
      headStyles: { fillColor: [39, 174, 96], fontSize: 9 },
      bodyStyles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    });

    this.footer(doc, today);
    doc.save(`reservation-${r.id}.pdf`);
  }

  // ── PDF: Rental Contract ─────────────────────────────────────────────────

  rentalContract(c: any): void {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('fr-FR');

    this.header(doc, 'RENTAL AGREEMENT', `Contract #${c.id}`, today);

    const clientName  = this.clientLabel(c);
    const clientCIN   = c.clientCIN   || c.client?.cin       || '—';
    const clientPhone = c.clientPhone || c.client?.telephone || '—';

    autoTable(doc, {
      startY: 50,
      head: [['PARTIES', '']],
      body: [
        ['Lessor (Company)', 'AGOCAR'],
        ['Lessee (Client)',  clientName],
        ['CIN / ID',         clientCIN],
        ['Phone',            clientPhone],
      ],
      headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
      bodyStyles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [['VEHICLE', '']],
      body: [['Vehicle', this.vehicleLabel(c)]],
      headStyles: { fillColor: [52, 73, 94], fontSize: 9 },
      bodyStyles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
    });

    const dateDebut = c.dateDebut ? new Date(c.dateDebut).toLocaleDateString('fr-FR') : '—';
    const dateFin   = c.dateFin   ? new Date(c.dateFin).toLocaleDateString('fr-FR')   : '—';
    let duration = '—';
    if (c.dateDebut && c.dateFin) {
      const diff = Math.ceil((new Date(c.dateFin).getTime() - new Date(c.dateDebut).getTime()) / 86400000);
      duration = `${diff} day(s)`;
    }

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [['RENTAL PERIOD', '']],
      body: [
        ['Start Date', dateDebut],
        ['End Date',   dateFin],
        ['Duration',   duration],
      ],
      headStyles: { fillColor: [52, 73, 94], fontSize: 9 },
      bodyStyles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [['FINANCIAL TERMS', '']],
      body: [['Total Amount', this.money(parseFloat(c.montantTotal || c.montant || 0))]],
      headStyles: { fillColor: [39, 174, 96], fontSize: 9 },
      bodyStyles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
    });

    const sigY = (doc as any).lastAutoTable.finalY + 24;
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text('Lessor Signature:', 14, sigY);
    doc.line(14, sigY + 14, 85, sigY + 14);
    doc.text('Lessee Signature:', 120, sigY);
    doc.line(120, sigY + 14, 196, sigY + 14);

    this.footer(doc, today);
    doc.save(`contrat-${c.id}.pdf`);
  }

  // ── PDF: Compliance Report ───────────────────────────────────────────────

  compliancePDF(expired: any[], critical: any[], warning: any[]): void {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('fr-FR');

    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.text('AGOCAR', 105, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('COMPLIANCE REPORT', 105, 27, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(130);
    doc.text(`Generated: ${today}`, 105, 34, { align: 'center' });

    const toRows = (arr: any[]) => arr.map(n => [
      n.vehicleLabel,
      (n.source || '').toUpperCase(),
      n.expiryDate ? new Date(n.expiryDate).toLocaleDateString('fr-FR') : '—',
      n.isKmBased ? `${n.kmLeft} km` : `${n.daysLeft}d`,
      n.detail || '—',
    ]);

    let startY = 42;

    if (expired.length) {
      autoTable(doc, {
        startY,
        head: [['EXPIRED VEHICLES', '', '', '', '']],
        body: toRows(expired),
        headStyles: { fillColor: [231, 76, 60], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 50 }, 3: { cellWidth: 20 } },
      });
      startY = (doc as any).lastAutoTable.finalY + 8;
    }

    if (critical.length) {
      autoTable(doc, {
        startY,
        head: [['CRITICAL — DUE WITHIN 7 DAYS', '', '', '', '']],
        body: toRows(critical),
        headStyles: { fillColor: [230, 126, 34], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 50 }, 3: { cellWidth: 20 } },
      });
      startY = (doc as any).lastAutoTable.finalY + 8;
    }

    if (warning.length) {
      autoTable(doc, {
        startY,
        head: [['WARNING — DUE WITHIN 30 DAYS', '', '', '', '']],
        body: toRows(warning),
        headStyles: { fillColor: [241, 196, 15], textColor: [0, 0, 0], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 50 }, 3: { cellWidth: 20 } },
      });
    }

    this.footer(doc, today);
    doc.save(`compliance-${today.replace(/\//g, '-')}.pdf`);
  }

  // ── Excel: Expense (Insurance + Repairs + Oil Changes) ───────────────────

  expenseExcel(assurances: any[], reparations: any[], vidanges: any[]): void {
    const wb = XLSX.utils.book_new();

    const insRows = [
      ['Vehicle', 'Company', 'Type', 'Start Date', 'End Date', 'Amount (MAD)'],
      ...assurances.map(a => [
        a.voitureImmatriculation || a.voiture?.immatriculation || `#${a.voitureId}`,
        a.compagnie || '—',
        a.typeAssurance || '—',
        a.dateDebut ? new Date(a.dateDebut).toLocaleDateString('fr-FR') : '—',
        a.dateFin   ? new Date(a.dateFin).toLocaleDateString('fr-FR')   : '—',
        parseFloat(a.montant || 0),
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(insRows), 'Insurance');

    const repRows = [
      ['Vehicle', 'Description', 'Date', 'Cost (MAD)'],
      ...reparations.map(r => [
        r.voitureImmatriculation || r.voiture?.immatriculation || `#${r.voitureId}`,
        r.description || r.typeReparation || '—',
        (r.date || r.dateReparation) ? new Date(r.date || r.dateReparation).toLocaleDateString('fr-FR') : '—',
        parseFloat(r.montant || r.cout || 0),
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(repRows), 'Repairs');

    const oilRows = [
      ['Vehicle', 'Date', 'KM at Change', 'Next KM', 'Cost (MAD)'],
      ...vidanges.map(v => [
        v.voitureImmatriculation || v.voiture?.immatriculation || `#${v.voitureId}`,
        (v.date || v.dateVidange) ? new Date(v.date || v.dateVidange).toLocaleDateString('fr-FR') : '—',
        v.kilometrage || v.km || '—',
        v.prochaineVidange || v.kmProchain || '—',
        parseFloat(v.montant || 0),
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(oilRows), 'Oil Changes');

    XLSX.writeFile(wb, `expense-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  // ── Excel: Financial Report ──────────────────────────────────────────────

  financialExcel(monthBars: { label: string; revenue: number; expenses: number }[], year: number): void {
    const wb = XLSX.utils.book_new();

    const rows: (string | number)[][] = [
      ['Month', 'Revenue (MAD)', 'Expenses (MAD)', 'Profit (MAD)'],
      ...monthBars.map(b => [b.label, b.revenue, b.expenses, b.revenue - b.expenses]),
    ];
    const totalRev = monthBars.reduce((s, b) => s + b.revenue, 0);
    const totalExp = monthBars.reduce((s, b) => s + b.expenses, 0);
    rows.push(['TOTAL', totalRev, totalExp, totalRev - totalExp]);

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), `Financial ${year}`);
    XLSX.writeFile(wb, `financial-report-${year}.xlsx`);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private header(doc: jsPDF, title: string, ref: string, date: string): void {
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.text('AGOCAR', 105, 18, { align: 'center' });
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text(title, 105, 27, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(130);
    doc.text(ref, 14, 38);
    doc.text(`Date: ${date}`, 196, 38, { align: 'right' });
    doc.setLineWidth(0.4);
    doc.setDrawColor(200);
    doc.line(14, 43, 196, 43);
  }

  private footer(doc: jsPDF, date: string): void {
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(160);
    doc.text('AGOCAR — Car Rental Management System', 105, pageH - 10, { align: 'center' });
    doc.text(`Generated on ${date}`, 105, pageH - 5, { align: 'center' });
  }

  private clientLabel(item: any): string {
    if (item.clientNom || item.client?.nom) {
      return `${item.clientPrenom || item.client?.prenom || ''} ${item.clientNom || item.client?.nom || ''}`.trim();
    }
    return `Client #${item.clientId}`;
  }

  private vehicleLabel(item: any): string {
    const plate = item.voiture?.immatriculation || item.voitureImmatriculation;
    const brand = item.voiture?.marque || '';
    const model = item.voiture?.modele || '';
    if (plate) return `${brand} ${model} — ${plate}`.trim().replace(/^—/, '').trim();
    return `${brand} ${model}`.trim() || `Car #${item.voitureId}`;
  }

  private accessoiresLabel(r: any): string {
    if (r.accessoires && Array.isArray(r.accessoires) && r.accessoires.length) {
      return r.accessoires.map((a: any) => a.nom || a.name || a).join(', ');
    }
    return '—';
  }

  private money(n: number): string {
    return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;
  }
}
