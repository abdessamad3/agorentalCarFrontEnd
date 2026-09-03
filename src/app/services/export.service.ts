import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Workbook, Worksheet } from 'exceljs';

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

  // ── Excel: Expense (from depense ledger, matching financial report) ──────────

  async expenseExcel(depenses: any[]): Promise<void> {
    const wb = new Workbook();
    wb.creator = 'AGOCAR';
    wb.created = wb.modified = new Date();

    const C = {
      primary:   'FF1F4E78',
      secondary: 'FFD9EAF7',
      sectionBg: 'FF2D6A9F',
      white:     'FFFFFFFF',
      border:    'FFC8C8C8',
      altRow:    'FFF7FAFC',
      labelBg:   'FFEDF2F7',
      summaryBg: 'FFEBF3FB',
      labelGray: 'FF718096',
      darkText:  'FF1A202C',
      expenseBg: 'FFF8D7DA',
      expenseFg: 'FF721C24',
      totBg:     'FF2D6A9F',
    };

    const fill       = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });
    const thin       = (argb = C.border) => ({ style: 'thin' as const, color: { argb } });
    const med        = (argb = C.primary) => ({ style: 'medium' as const, color: { argb } });
    const allBorders = (argb = C.border) => { const b = thin(argb); return { top: b, left: b, bottom: b, right: b }; };

    // Group depenses by typeDepense
    const byType: Record<string, { count: number; total: number }> = {};
    const grandTotal = depenses.reduce((s, e) => {
      const type = e.typeDepense || 'Other';
      if (!byType[type]) byType[type] = { count: 0, total: 0 };
      const amt = parseFloat(e.montant) || 0;
      byType[type].count++;
      byType[type].total += amt;
      return s + amt;
    }, 0);

    const typeRows = Object.entries(byType)
      .map(([type, { count, total }]) => ({ type, count, total }))
      .sort((a, b) => b.total - a.total);

    // Sort all depenses by date descending
    const sorted = [...depenses].sort((a, b) => {
      const da = new Date(a.date || a.dateDepense || a.creeAu || 0).getTime();
      const db = new Date(b.date || b.dateDepense || b.creeAu || 0).getTime();
      return db - da;
    });

    // ── Sheet 1: Overview (breakdown by type) ─────────────────────────────────
    const ov = wb.addWorksheet('Overview');
    ov.columns = [{ width: 26 }, { width: 14 }, { width: 22 }, { width: 16 }];

    ov.mergeCells('A1:D1');
    const ov1 = ov.getCell('A1');
    ov1.value = 'AGOCAR'; ov1.font = { name: 'Calibri', size: 18, bold: true, color: { argb: C.white } };
    ov1.fill = fill(C.primary); ov1.alignment = { horizontal: 'center', vertical: 'middle' };
    ov.getRow(1).height = 36;

    ov.mergeCells('A2:D2');
    const ov2 = ov.getCell('A2');
    ov2.value = 'Expense Report'; ov2.font = { name: 'Calibri', size: 13, color: { argb: C.primary } };
    ov2.fill = fill(C.secondary); ov2.alignment = { horizontal: 'center', vertical: 'middle' };
    ov.getRow(2).height = 24;

    ov.mergeCells('A3:D3');
    const ov3 = ov.getCell('A3');
    ov3.value = `Generated: ${new Date().toLocaleString('fr-FR')}`;
    ov3.font = { name: 'Calibri', size: 9, color: { argb: C.labelGray } };
    ov3.fill = fill(C.labelBg); ov3.alignment = { horizontal: 'center', vertical: 'middle' };
    ov.getRow(3).height = 18;
    ov.getRow(4).height = 8;

    ov.mergeCells('A5:D5');
    const ov5 = ov.getCell('A5');
    ov5.value = 'EXPENSE SUMMARY'; ov5.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.white } };
    ov5.fill = fill(C.sectionBg); ov5.alignment = { horizontal: 'center', vertical: 'middle' };
    ov.getRow(5).height = 18;

    // KPI pair: Total Records | Grand Total
    ov.getRow(6).height = 22;
    ov.mergeCells('A6:B6');
    const k6l = ov.getCell('A6');
    k6l.value = 'Total Records'; k6l.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.labelGray } };
    k6l.fill = fill(C.labelBg); k6l.alignment = { horizontal: 'right', vertical: 'middle' }; k6l.border = allBorders();
    ov.mergeCells('C6:D6');
    const k6v = ov.getCell('C6');
    k6v.value = depenses.length; k6v.numFmt = '#,##0';
    k6v.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.darkText } };
    k6v.fill = fill(C.summaryBg); k6v.alignment = { horizontal: 'right', vertical: 'middle' }; k6v.border = allBorders();

    ov.getRow(7).height = 22;
    ov.mergeCells('A7:B7');
    const k7l = ov.getCell('A7');
    k7l.value = 'Grand Total'; k7l.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.labelGray } };
    k7l.fill = fill(C.labelBg); k7l.alignment = { horizontal: 'right', vertical: 'middle' }; k7l.border = allBorders();
    ov.mergeCells('C7:D7');
    const k7v = ov.getCell('C7');
    k7v.value = grandTotal; k7v.numFmt = '#,##0.00 "MAD"';
    k7v.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.expenseFg } };
    k7v.fill = fill(C.summaryBg); k7v.alignment = { horizontal: 'right', vertical: 'middle' }; k7v.border = allBorders();

    ov.getRow(8).height = 8;

    // Breakdown table header
    const ovHDR = 9;
    ov.getRow(ovHDR).height = 25;
    ['Expense Type', 'Records', 'Total (MAD)', '% of Total'].forEach((h, i) => {
      const c = ov.getCell(ovHDR, i + 1);
      c.value = h; c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.white } };
      c.fill = fill(C.primary); c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = { top: med(), bottom: med(), left: thin(), right: thin() };
    });
    ov.autoFilter = `A${ovHDR}:D${ovHDR}`;

    typeRows.forEach(({ type, count, total }, i) => {
      const r   = ovHDR + 1 + i;
      const pct = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
      const bg  = i % 2 === 1 ? C.altRow : C.white;
      ov.getRow(r).height = 20;

      const ca = ov.getCell(r, 1);
      ca.value = type; ca.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.darkText } };
      ca.fill = fill(bg); ca.alignment = { horizontal: 'left', vertical: 'middle' }; ca.border = allBorders();

      const cb = ov.getCell(r, 2);
      cb.value = count; cb.numFmt = '#,##0';
      cb.font = { name: 'Calibri', size: 10, color: { argb: C.darkText } };
      cb.fill = fill(bg); cb.alignment = { horizontal: 'center', vertical: 'middle' }; cb.border = allBorders();

      const cc = ov.getCell(r, 3);
      cc.value = total; cc.numFmt = '#,##0.00 "MAD"';
      cc.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.expenseFg } };
      cc.fill = fill(C.expenseBg); cc.alignment = { horizontal: 'right', vertical: 'middle' }; cc.border = allBorders();

      const cd = ov.getCell(r, 4);
      cd.value = pct; cd.numFmt = '0"%"';
      cd.font = { name: 'Calibri', size: 10, color: { argb: C.labelGray } };
      cd.fill = fill(bg); cd.alignment = { horizontal: 'center', vertical: 'middle' }; cd.border = allBorders();
    });

    // Grand Total row
    const gtRow = ovHDR + 1 + typeRows.length;
    ov.getRow(gtRow).height = 24;
    [[1, 'TOTAL', null], [2, depenses.length, '#,##0'], [3, grandTotal, '#,##0.00 "MAD"'], [4, 100, '0"%"']]
      .forEach(([col, val, fmt]) => {
        const c = ov.getCell(gtRow, col as number);
        c.value = val as any; if (fmt) c.numFmt = fmt as string;
        c.font  = { name: 'Calibri', size: 11, bold: true, color: { argb: C.white } };
        c.fill  = fill(C.totBg);
        c.alignment = { horizontal: col === 3 ? 'right' : col === 1 ? 'left' : 'center', vertical: 'middle' };
        const isFirst = col === 1; const isLast = col === 4;
        c.border = { top: med(), bottom: med(), left: isFirst ? med() : thin(), right: isLast ? med() : thin() };
      });

    ov.pageSetup.paperSize   = 9; ov.pageSetup.orientation = 'portrait';
    ov.pageSetup.fitToPage   = true; ov.pageSetup.fitToWidth = 1;
    ov.pageSetup.margins     = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };
    ov.headerFooter.oddHeader = `&C&"Calibri,Bold"&14AGOCAR — Expense Report`;
    ov.headerFooter.oddFooter = `&L&8Generated: ${new Date().toLocaleDateString('fr-FR')}&R&8Page &P of &N`;

    // ── Sheet 2: All Expenses (full list sorted by date desc) ──────────────────
    const ws2 = wb.addWorksheet('All Expenses');
    ws2.columns = [{ width: 14 }, { width: 24 }, { width: 36 }, { width: 20 }];

    ws2.mergeCells('A1:D1');
    const w1 = ws2.getCell('A1');
    w1.value = 'AGOCAR'; w1.font = { name: 'Calibri', size: 18, bold: true, color: { argb: C.white } };
    w1.fill = fill(C.primary); w1.alignment = { horizontal: 'center', vertical: 'middle' };
    ws2.getRow(1).height = 36;

    ws2.mergeCells('A2:D2');
    const w2 = ws2.getCell('A2');
    w2.value = 'All Expenses — Detail'; w2.font = { name: 'Calibri', size: 13, color: { argb: C.primary } };
    w2.fill = fill(C.secondary); w2.alignment = { horizontal: 'center', vertical: 'middle' };
    ws2.getRow(2).height = 24;

    ws2.mergeCells('A3:D3');
    const w3 = ws2.getCell('A3');
    w3.value = `Generated: ${new Date().toLocaleString('fr-FR')}`;
    w3.font = { name: 'Calibri', size: 9, color: { argb: C.labelGray } };
    w3.fill = fill(C.labelBg); w3.alignment = { horizontal: 'center', vertical: 'middle' };
    ws2.getRow(3).height = 18;
    ws2.getRow(4).height = 8;

    // Detail table header
    const detHDR = 5;
    ws2.getRow(detHDR).height = 25;
    ['Date', 'Expense Type', 'Description / Notes', 'Amount (MAD)'].forEach((h, i) => {
      const c = ws2.getCell(detHDR, i + 1);
      c.value = h; c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.white } };
      c.fill = fill(C.sectionBg); c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = { top: med(), bottom: med(), left: thin(), right: thin() };
    });
    ws2.autoFilter = `A${detHDR}:D${detHDR}`;

    sorted.forEach((e, i) => {
      const r      = detHDR + 1 + i;
      const bg     = i % 2 === 1 ? C.altRow : C.white;
      const amt    = parseFloat(e.montant) || 0;
      const rawDate = e.date || e.dateDepense || e.creeAu;
      const dateStr = rawDate ? new Date(rawDate).toLocaleDateString('fr-FR') : '—';
      ws2.getRow(r).height = 20;

      const ca = ws2.getCell(r, 1);
      ca.value = dateStr; ca.font = { name: 'Calibri', size: 10, color: { argb: C.darkText } };
      ca.fill = fill(bg); ca.alignment = { horizontal: 'center', vertical: 'middle' }; ca.border = allBorders();

      const cb = ws2.getCell(r, 2);
      cb.value = e.typeDepense || 'Other'; cb.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.darkText } };
      cb.fill = fill(bg); cb.alignment = { horizontal: 'left', vertical: 'middle' }; cb.border = allBorders();

      const cc = ws2.getCell(r, 3);
      cc.value = e.description || e.notes || '—'; cc.font = { name: 'Calibri', size: 10, color: { argb: C.darkText } };
      cc.fill = fill(bg); cc.alignment = { horizontal: 'left', vertical: 'middle' }; cc.border = allBorders();

      const cd = ws2.getCell(r, 4);
      cd.value = amt; cd.numFmt = '#,##0.00 "MAD"';
      cd.font = { name: 'Calibri', size: 10, bold: amt > 0, color: { argb: amt > 0 ? C.expenseFg : C.darkText } };
      cd.fill = fill(amt > 0 ? C.expenseBg : bg); cd.alignment = { horizontal: 'right', vertical: 'middle' }; cd.border = allBorders();
    });

    // Detail TOTAL row
    const detTotRow = detHDR + 1 + sorted.length;
    ws2.getRow(detTotRow).height = 24;
    [[1, 'TOTAL', null], [2, '', null], [3, '', null], [4, grandTotal, '#,##0.00 "MAD"']].forEach(([col, val, fmt]) => {
      const c = ws2.getCell(detTotRow, col as number);
      c.value = val as any; if (fmt) c.numFmt = fmt as string;
      c.font  = { name: 'Calibri', size: 11, bold: true, color: { argb: C.white } };
      c.fill  = fill(C.totBg);
      c.alignment = { horizontal: col === 4 ? 'right' : 'center', vertical: 'middle' };
      const isFirst = col === 1; const isLast = col === 4;
      c.border = { top: med(), bottom: med(), left: isFirst ? med() : thin(), right: isLast ? med() : thin() };
    });

    ws2.pageSetup.paperSize   = 9; ws2.pageSetup.orientation = 'landscape';
    ws2.pageSetup.fitToPage   = true; ws2.pageSetup.fitToWidth = 1;
    ws2.pageSetup.margins     = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };
    ws2.headerFooter.oddHeader = `&C&"Calibri,Bold"&12AGOCAR — All Expenses`;
    ws2.headerFooter.oddFooter = `&L&8Generated: ${new Date().toLocaleDateString('fr-FR')}&R&8Page &P of &N`;

    // ── Download ───────────────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `expense-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Excel: Financial Report ──────────────────────────────────────────────

  async financialExcel(monthBars: { label: string; revenue: number; expenses: number }[], year: number): Promise<void> {
    const wb = new Workbook();
    wb.creator = 'AGOCAR';
    wb.created = wb.modified = new Date();

    const ws = wb.addWorksheet(`Financial ${year}`);

    // Colour palette
    const C = {
      primary:   'FF1F4E78',
      secondary: 'FFD9EAF7',
      sectionBg: 'FF2D6A9F',
      white:     'FFFFFFFF',
      border:    'FFC8C8C8',
      altRow:    'FFF7FAFC',
      labelBg:   'FFEDF2F7',
      summaryBg: 'FFEBF3FB',
      labelGray: 'FF718096',
      darkText:  'FF1A202C',
      revenueBg: 'FFD4EDDA', revenueFg: 'FF155724',
      expenseBg: 'FFF8D7DA', expenseFg: 'FF721C24',
      profitPos: 'FF276749',
      profitNeg: 'FFC53030',
      totBg:     'FF2D6A9F',
    };

    const fill = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });
    const thin = (argb = C.border) => ({ style: 'thin' as const, color: { argb } });
    const medium = (argb = C.primary) => ({ style: 'medium' as const, color: { argb } });
    const allBorders = (argb = C.border) => { const b = thin(argb); return { top: b, left: b, bottom: b, right: b }; };

    // Column widths: A=Month  B=Revenue  C=Expenses  D=Net Profit  E=Margin%
    ws.columns = [
      { width: 18 },
      { width: 22 },
      { width: 22 },
      { width: 22 },
      { width: 14 },
    ];

    // Row 1 — company header
    ws.mergeCells('A1:E1');
    const r1 = ws.getCell('A1');
    r1.value     = 'AGOCAR';
    r1.font      = { name: 'Calibri', size: 18, bold: true, color: { argb: C.white } };
    r1.fill      = fill(C.primary);
    r1.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 36;

    // Row 2 — subtitle
    ws.mergeCells('A2:E2');
    const r2 = ws.getCell('A2');
    r2.value     = `Financial Report — ${year}`;
    r2.font      = { name: 'Calibri', size: 13, color: { argb: C.primary } };
    r2.fill      = fill(C.secondary);
    r2.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 24;

    // Row 3 — generated date
    ws.mergeCells('A3:E3');
    const r3 = ws.getCell('A3');
    r3.value     = `Generated: ${new Date().toLocaleString('fr-FR')}`;
    r3.font      = { name: 'Calibri', size: 9, color: { argb: C.labelGray } };
    r3.fill      = fill(C.labelBg);
    r3.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(3).height = 18;

    // Row 4 — spacer
    ws.getRow(4).height = 8;

    // Row 5 — summary section header
    ws.mergeCells('A5:E5');
    const r5 = ws.getCell('A5');
    r5.value     = 'SUMMARY';
    r5.font      = { name: 'Calibri', size: 10, bold: true, color: { argb: C.white } };
    r5.fill      = fill(C.sectionBg);
    r5.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(5).height = 18;

    const totalRev  = monthBars.reduce((s, b) => s + b.revenue,  0);
    const totalExp  = monthBars.reduce((s, b) => s + b.expenses, 0);
    const netProfit = totalRev - totalExp;
    const margin    = totalRev > 0 ? Math.round((netProfit / totalRev) * 100) : 0;

    // KPI pair helper: A=label | B:C merged=money value | D=label | E=value
    const kpiPair = (row: number, lA: string, vA: number, lB: string, vB: number, isPercent = false) => {
      ws.getRow(row).height = 22;

      const la = ws.getCell(`A${row}`);
      la.value = lA; la.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.labelGray } };
      la.fill = fill(C.labelBg); la.alignment = { horizontal: 'right', vertical: 'middle' }; la.border = allBorders();

      ws.mergeCells(`B${row}:C${row}`);
      const va = ws.getCell(`B${row}`);
      va.value = vA; va.numFmt = '#,##0.00 "MAD"';
      va.font = { name: 'Calibri', size: 10, bold: true, color: { argb: vA >= 0 ? C.profitPos : C.profitNeg } };
      va.fill = fill(C.summaryBg); va.alignment = { horizontal: 'right', vertical: 'middle' }; va.border = allBorders();

      const lb = ws.getCell(`D${row}`);
      lb.value = lB; lb.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.labelGray } };
      lb.fill = fill(C.labelBg); lb.alignment = { horizontal: 'right', vertical: 'middle' }; lb.border = allBorders();

      const vb = ws.getCell(`E${row}`);
      vb.value = vB; vb.numFmt = isPercent ? '0"%"' : '#,##0.00 "MAD"';
      vb.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.darkText } };
      vb.fill = fill(C.summaryBg); vb.alignment = { horizontal: 'right', vertical: 'middle' }; vb.border = allBorders();
    };

    kpiPair(6, 'Total Revenue',  totalRev,  'Total Expenses', totalExp);
    kpiPair(7, 'Net Profit',     netProfit, 'Profit Margin',  margin, true);

    // Row 8 — spacer
    ws.getRow(8).height = 8;

    // Row 9 — table header
    const HDR = 9;
    ws.getRow(HDR).height = 25;
    ['Month', 'Revenue (MAD)', 'Expenses (MAD)', 'Net Profit (MAD)', 'Margin %'].forEach((label, i) => {
      const c = ws.getCell(HDR, i + 1);
      c.value     = label;
      c.font      = { name: 'Calibri', size: 11, bold: true, color: { argb: C.white } };
      c.fill      = fill(C.primary);
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border    = { top: medium(), left: thin(), bottom: medium(), right: thin() };
    });

    ws.autoFilter = `A${HDR}:E${HDR}`;

    // Rows 10–21 — monthly data
    monthBars.forEach((b, i) => {
      const row    = HDR + 1 + i;
      const isAlt  = i % 2 === 1;
      const bg     = isAlt ? C.altRow : C.white;
      const profit = b.revenue - b.expenses;
      const m      = b.revenue > 0 ? Math.round((profit / b.revenue) * 100) : 0;
      ws.getRow(row).height = 20;

      const ac = ws.getCell(row, 1);
      ac.value = b.label; ac.font = { name: 'Calibri', size: 10, color: { argb: C.darkText } };
      ac.fill = fill(bg); ac.alignment = { horizontal: 'left', vertical: 'middle' }; ac.border = allBorders();

      const bc = ws.getCell(row, 2);
      bc.value = b.revenue; bc.numFmt = '#,##0.00 "MAD"';
      bc.font = { name: 'Calibri', size: 10, color: { argb: b.revenue > 0 ? C.revenueFg : C.darkText } };
      bc.fill = fill(b.revenue > 0 ? C.revenueBg : bg);
      bc.alignment = { horizontal: 'right', vertical: 'middle' }; bc.border = allBorders();

      const cc = ws.getCell(row, 3);
      cc.value = b.expenses; cc.numFmt = '#,##0.00 "MAD"';
      cc.font = { name: 'Calibri', size: 10, color: { argb: b.expenses > 0 ? C.expenseFg : C.darkText } };
      cc.fill = fill(b.expenses > 0 ? C.expenseBg : bg);
      cc.alignment = { horizontal: 'right', vertical: 'middle' }; cc.border = allBorders();

      const dc = ws.getCell(row, 4);
      dc.value = profit; dc.numFmt = '#,##0.00 "MAD"';
      dc.font = { name: 'Calibri', size: 10, bold: profit !== 0, color: { argb: profit >= 0 ? C.profitPos : C.profitNeg } };
      dc.fill = fill(bg); dc.alignment = { horizontal: 'right', vertical: 'middle' }; dc.border = allBorders();

      const ec = ws.getCell(row, 5);
      ec.value = m; ec.numFmt = '0"%"';
      ec.font = { name: 'Calibri', size: 10, color: { argb: m >= 0 ? C.profitPos : C.profitNeg } };
      ec.fill = fill(bg); ec.alignment = { horizontal: 'center', vertical: 'middle' }; ec.border = allBorders();
    });

    // Total row
    const totRow = HDR + 1 + monthBars.length;
    ws.getRow(totRow).height = 24;

    [[1, 'TOTAL', null], [2, totalRev, '#,##0.00 "MAD"'], [3, totalExp, '#,##0.00 "MAD"'],
     [4, netProfit, '#,##0.00 "MAD"'], [5, margin, '0"%"']].forEach(([col, val, fmt]) => {
      const c = ws.getCell(totRow, col as number);
      c.value = val as any;
      if (fmt) c.numFmt = fmt as string;
      c.font      = { name: 'Calibri', size: 11, bold: true, color: { argb: C.white } };
      c.fill      = fill(C.totBg);
      c.alignment = { horizontal: col === 1 ? 'center' : col === 5 ? 'center' : 'right', vertical: 'middle' };
      const isFirst = col === 1, isLast = col === 5;
      c.border = {
        top:    medium(),
        bottom: medium(),
        left:   isFirst ? medium() : thin(),
        right:  isLast  ? medium() : thin(),
      };
    });

    // Page setup
    ws.pageSetup.paperSize   = 9;
    ws.pageSetup.orientation = 'landscape';
    ws.pageSetup.fitToPage   = true;
    ws.pageSetup.fitToWidth  = 1;
    ws.pageSetup.margins     = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };
    ws.headerFooter.oddHeader = `&C&"Calibri,Bold"&14AGOCAR — Financial Report ${year}`;
    ws.headerFooter.oddFooter = `&L&8Generated: ${new Date().toLocaleDateString('fr-FR')}&R&8Page &P of &N`;

    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `financial-report-${year}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
