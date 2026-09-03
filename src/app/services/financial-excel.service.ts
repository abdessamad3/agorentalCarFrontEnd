import { Injectable } from '@angular/core';
import { Workbook, Worksheet } from 'exceljs';
import { TranslationService } from './translation.service';

@Injectable({ providedIn: 'root' })
export class FinancialExcelService {

  constructor(private ts: TranslationService) {}

  private t(key: string): string { return this.ts.translate(key); }

  // ─── ARGB colour palette ─────────────────────────────────────────────────────
  private readonly C = {
    primary:   'FF1F4E78',
    secondary: 'FFD9EAF7',
    sectionBg: 'FF2D6A9F',
    white:     'FFFFFFFF',
    border:    'FFC8C8C8',
    altRow:    'FFF7FAFC',
    labelBg:   'FFEDF2F7',
    summaryBg: 'FFEBF3FB',
    titleBlue: 'FF1F4E78',
    labelGray: 'FF718096',
    darkText:  'FF1A202C',
    paidBg:    'FFD4EDDA', paidFg:    'FF155724',
    unpaidBg:  'FFF8D7DA', unpaidFg:  'FF721C24',
    pendingBg: 'FFFFF3CD', pendingFg: 'FF856404',
    posFg:     'FF276749',
    negFg:     'FFC53030',
    zeroFg:    'FFA0AEC0',
  } as const;

  // ─── Style helpers ───────────────────────────────────────────────────────────
  private fill(argb: string) {
    return { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } };
  }

  private thin(argb = this.C.border) {
    return { style: 'thin' as const, color: { argb } };
  }

  private medium(argb = this.C.primary) {
    return { style: 'medium' as const, color: { argb } };
  }

  private allBorders(argb = this.C.border) {
    const b = this.thin(argb);
    return { top: b, left: b, bottom: b, right: b };
  }

  // ─── Public entry point ──────────────────────────────────────────────────────
  async export(
    transactions: any[],
    car: any,
    carId: number,
    filters: { type?: string; status?: string; from?: string; to?: string },
    generatedBy: string,
  ): Promise<void> {
    const wb = new Workbook();
    wb.creator  = 'Cadori';
    wb.company  = 'Cadori';
    wb.subject  = this.t('vehicleTransactionsReport');
    wb.category = 'Financial Report';
    wb.created  = wb.modified = new Date();

    // Create worksheet first, then apply page setup individually —
    // passing everything in the constructor causes XML corruption in the browser build.
    const ws = wb.addWorksheet(this.t('transactions'));

    ws.pageSetup.paperSize   = 9;          // A4
    ws.pageSetup.orientation = 'landscape';
    ws.pageSetup.margins     = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };
    ws.pageSetup.fitToPage   = true;
    ws.pageSetup.fitToWidth  = 1;
    ws.pageSetup.fitToHeight = 1;

    ws.headerFooter.oddFooter = `&L&8${this.t('reportConfidential')}&R&8Page &P of &N`;

    // Column widths — A Date | B Type | C Description | D Amount | E Reservation Status | F Payment Status
    ws.columns = [
      { width: 16 }, // A  Date
      { width: 20 }, // B  Transaction Type
      { width: 36 }, // C  Description
      { width: 18 }, // D  Amount (MAD)
      { width: 20 }, // E  Reservation Status
      { width: 18 }, // F  Payment Status
    ];

    this.buildHeader(ws, car, carId, filters, transactions.length, generatedBy);
    this.buildSummary(ws, transactions);
    this.buildTable(ws, transactions);

    // Stream to browser download
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `transactions-${carId}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ─── Report header — rows 1–7 ────────────────────────────────────────────────
  private buildHeader(
    ws: Worksheet,
    car: any,
    carId: number,
    filters: any,
    count: number,
    user: string,
  ): void {
    // Row 1 — company name
    ws.mergeCells('A1:F1');
    const c1 = ws.getCell('A1');
    c1.value     = 'CADORI';
    c1.font      = { name: 'Calibri', size: 18, bold: true, color: { argb: this.C.white } };
    c1.fill      = this.fill(this.C.primary);
    c1.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 36;

    // Row 2 — report title
    ws.mergeCells('A2:F2');
    const c2 = ws.getCell('A2');
    c2.value     = this.t('vehicleTransactionsReport');
    c2.font      = { name: 'Calibri', size: 12, bold: false, color: { argb: this.C.titleBlue } };
    c2.fill      = this.fill(this.C.secondary);
    c2.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 24;

    // Row 3 — spacer
    ws.getRow(3).height = 8;

    // Rows 4–6 — vehicle info pairs: A=label | B:D=value | E=label | F=value
    const carName   = [car?.marque, car?.modele].filter(Boolean).join(' ') || `Car #${carId}`;
    const plate     = car?.immatriculation || '-';
    const genDate   = new Date().toLocaleString(this.localeString());
    const filterStr = [
      filters.type   ? `${this.t('type')}: ${filters.type}`     : '',
      filters.status ? `${this.t('status')}: ${filters.status}` : '',
      filters.from   ? `${this.t('from')}: ${filters.from}`     : '',
      filters.to     ? `${this.t('to')}: ${filters.to}`         : '',
    ].filter(Boolean).join(' | ') || this.t('none');

    this.infoPair(ws, 4, this.t('vehicle'),        carName,           this.t('registration'),  plate);
    this.infoPair(ws, 5, this.t('generatedOn'),    genDate,           this.t('generatedBy'),   user);
    this.infoPair(ws, 6, this.t('activeFilters'),  filterStr,         this.t('totalRecords'),  String(count));

    // Row 7 — spacer
    ws.getRow(7).height = 8;
  }

  // Two label-value pairs spanning A-F: A=label | B:D=value | E=label | F=value
  private infoPair(ws: Worksheet, row: number, lA: string, vA: string, lB: string, vB: string): void {
    ws.getRow(row).height = 20;

    const la = ws.getCell(`A${row}`);
    la.value     = lA;
    la.font      = { name: 'Calibri', size: 10, bold: true, color: { argb: this.C.labelGray } };
    la.fill      = this.fill(this.C.labelBg);
    la.alignment = { horizontal: 'right', vertical: 'middle' };
    la.border    = this.allBorders();

    ws.mergeCells(`B${row}:D${row}`);
    const va = ws.getCell(`B${row}`);
    va.value     = vA;
    va.font      = { name: 'Calibri', size: 10, color: { argb: this.C.darkText } };
    va.fill      = this.fill(this.C.white);
    va.alignment = { horizontal: 'left', vertical: 'middle' };
    va.border    = this.allBorders();

    const lb = ws.getCell(`E${row}`);
    lb.value     = lB;
    lb.font      = { name: 'Calibri', size: 10, bold: true, color: { argb: this.C.labelGray } };
    lb.fill      = this.fill(this.C.labelBg);
    lb.alignment = { horizontal: 'right', vertical: 'middle' };
    lb.border    = this.allBorders();

    const vb = ws.getCell(`F${row}`);
    vb.value     = vB;
    vb.font      = { name: 'Calibri', size: 10, color: { argb: this.C.darkText } };
    vb.fill      = this.fill(this.C.white);
    vb.alignment = { horizontal: 'left', vertical: 'middle' };
    vb.border    = this.allBorders();
  }

  // ─── Summary section — rows 8–15 ─────────────────────────────────────────────
  private buildSummary(ws: Worksheet, transactions: any[]): void {
    const sumAmt = (pred: (t: any) => boolean) =>
      transactions.filter(pred).reduce((s, t) => s + +(t.amount || 0), 0);

    const payStatus = (t: any) => (t.paymentStatus || t.status || '').toLowerCase();
    const isPaid    = (s: string) => ['paid', 'overpaid'].includes(s);
    const isPend    = (s: string) => s === 'partial';

    const items: { label: string; value: number; money: boolean }[] = [
      { label: this.t('totalTransactions'),   value: transactions.length,                                                              money: false },
      { label: this.t('totalIncome'),         value: sumAmt(t => t.direction === 'income'),                                           money: true  },
      { label: this.t('totalExpenses'),       value: sumAmt(t => t.direction === 'expense'),                                          money: true  },
      { label: this.t('paidReservations'),    value: transactions.filter(t => t.direction === 'income' && isPaid(payStatus(t))).length, money: false },
      { label: this.t('unpaidPartialAmount'), value: sumAmt(t => t.direction === 'income' && !isPaid(payStatus(t))),                  money: true  },
      { label: this.t('partialReservations'), value: transactions.filter(t => t.direction === 'income' && isPend(payStatus(t))).length, money: false },
    ];

    // Row 8 — section header
    ws.mergeCells('A8:F8');
    const sh = ws.getCell('A8');
    sh.value     = this.t('summary').toUpperCase();
    sh.font      = { name: 'Calibri', size: 10, bold: true, color: { argb: this.C.white } };
    sh.fill      = this.fill(this.C.sectionBg);
    sh.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(8).height = 18;

    // Rows 9–14 — one item per row: A:B = label, C:F = value
    items.forEach((item, i) => {
      const r = 9 + i;
      ws.getRow(r).height = 18;

      ws.mergeCells(`A${r}:B${r}`);
      const lbl = ws.getCell(`A${r}`);
      lbl.value     = item.label;
      lbl.font      = { name: 'Calibri', size: 10, bold: true, color: { argb: this.C.labelGray } };
      lbl.fill      = this.fill(this.C.summaryBg);
      lbl.alignment = { horizontal: 'left', vertical: 'middle' };
      lbl.border    = this.allBorders();

      ws.mergeCells(`C${r}:F${r}`);
      const val = ws.getCell(`C${r}`);
      val.value     = item.value;
      val.numFmt    = item.money ? '#,##0.00 "MAD"' : '#,##0';
      val.font      = { name: 'Calibri', size: 10, bold: true, color: { argb: this.C.darkText } };
      val.fill      = this.fill(this.C.white);
      val.alignment = { horizontal: 'right', vertical: 'middle' };
      val.border    = this.allBorders();
    });

    // Row 15 — spacer
    ws.getRow(15).height = 8;
  }

  // ─── Data table — row 16 header, 17+ data rows ───────────────────────────────
  private buildTable(ws: Worksheet, transactions: any[]): void {
    const HDR  = 16;
    const COLS = [
      this.t('date'),
      this.t('transactionType'),
      this.t('description'),
      `${this.t('montant')} (MAD)`,
      this.t('reservationStatusCol'),
      this.t('paymentStatus'),
    ];

    // Header row
    ws.getRow(HDR).height = 25;
    COLS.forEach((label, i) => {
      const c = ws.getCell(HDR, i + 1);
      c.value     = label;
      c.font      = { name: 'Calibri', size: 11, bold: true, color: { argb: this.C.white } };
      c.fill      = this.fill(this.C.primary);
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border    = { top: this.medium(), left: this.thin(), bottom: this.medium(), right: this.thin() };
    });

    // Data rows
    transactions.forEach((tx, i) => {
      const row    = HDR + 1 + i;
      const isAlt  = i % 2 === 1;
      const bg     = isAlt ? this.C.altRow : this.C.white;
      const isIncome = tx.direction === 'income';
      ws.getRow(row).height = 22;

      const dateStr = tx.date ? new Date(tx.date).toLocaleDateString(this.localeString()) : '-';
      const amount  = isIncome ? +(tx.amount || 0) : -(tx.amount || 0);

      this.cell(ws, row, 1, dateStr,               bg, 'center');
      this.cell(ws, row, 2, tx.type || '-',        bg, 'center');
      this.cell(ws, row, 3, tx.description || '-', bg, 'left');

      // Column D — Amount, numeric colour-coded
      const ac   = ws.getCell(row, 4);
      ac.value   = amount;
      ac.numFmt  = '#,##0.00 "MAD"';
      ac.font    = {
        name: 'Calibri', size: 10,
        color: { argb: amount > 0 ? this.C.posFg : amount < 0 ? this.C.negFg : this.C.zeroFg },
      };
      ac.fill      = this.fill(bg);
      ac.alignment = { horizontal: 'right', vertical: 'middle' };
      ac.border    = this.allBorders();

      // Column E — Reservation Status (income rows only)
      if (isIncome) {
        const resVal = tx.reservationStatus || '-';
        const [rBg, rFg] = this.resStatusColors(resVal.toLowerCase());
        const ec   = ws.getCell(row, 5);
        ec.value   = resVal;
        ec.font    = { name: 'Calibri', size: 10, bold: true, color: { argb: rFg } };
        ec.fill    = this.fill(rBg);
        ec.alignment = { horizontal: 'center', vertical: 'middle' };
        ec.border    = this.allBorders();
      } else {
        this.cell(ws, row, 5, '-', bg, 'center');
      }

      // Column F — Payment Status
      const payVal = isIncome ? (tx.paymentStatus || '-') : (tx.status || '-');
      const [pBg, pFg] = isIncome
        ? this.payStatusColors(payVal.toLowerCase())
        : this.expStatusColors(payVal.toLowerCase());
      const fc   = ws.getCell(row, 6);
      fc.value   = payVal;
      fc.font    = { name: 'Calibri', size: 10, bold: true, color: { argb: pFg } };
      fc.fill    = this.fill(pBg);
      fc.alignment = { horizontal: 'center', vertical: 'middle' };
      fc.border    = this.allBorders();
    });

    // Native Excel auto filter on header row
    ws.autoFilter = `A${HDR}:F${HDR}`;
  }

  // ─── Cell helper ─────────────────────────────────────────────────────────────
  private cell(
    ws: Worksheet,
    row: number,
    col: number,
    value: string,
    bg: string,
    align: 'left' | 'center' | 'right',
  ): void {
    const c  = ws.getCell(row, col);
    c.value     = value;
    c.font      = { name: 'Calibri', size: 10, color: { argb: this.C.darkText } };
    c.fill      = this.fill(bg);
    c.alignment = { horizontal: align, vertical: 'middle' };
    c.border    = this.allBorders();
  }

  // ─── Locale helper ───────────────────────────────────────────────────────────
  private localeString(): string {
    const lang = this.ts.getCurrentLanguage();
    return lang === 'ar' ? 'ar-MA' : lang === 'fr' ? 'fr-FR' : 'en-US';
  }

  // ─── Colour maps ─────────────────────────────────────────────────────────────

  private resStatusColors(s: string): [string, string] {
    if (['confirmee', 'confirmed', 'en_cours'].includes(s))           return [this.C.paidBg,    this.C.paidFg];
    if (['annulee', 'cancelled', 'annule'].includes(s))               return [this.C.unpaidBg,  this.C.unpaidFg];
    if (['terminee', 'termine_avant_terme', 'completed'].includes(s)) return [this.C.secondary, this.C.primary];
    return [this.C.pendingBg, this.C.pendingFg];
  }

  private payStatusColors(s: string): [string, string] {
    if (s === 'paid' || s === 'overpaid') return [this.C.paidBg,    this.C.paidFg];
    if (s === 'partial')                  return [this.C.pendingBg, this.C.pendingFg];
    return [this.C.unpaidBg, this.C.unpaidFg];
  }

  private expStatusColors(s: string): [string, string] {
    if (['payee', 'paid', 'completed'].includes(s))        return [this.C.paidBg,    this.C.paidFg];
    if (['impaye', 'unpaid'].includes(s))                  return [this.C.unpaidBg,  this.C.unpaidFg];
    if (['pending', 'en_attente', 'partiel'].includes(s))  return [this.C.pendingBg, this.C.pendingFg];
    return [this.C.white, this.C.darkText];
  }
}
