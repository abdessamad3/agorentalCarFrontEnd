import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CrudService } from '../services/crud.service';
import { TranslationService } from '../services/translation.service';
import { catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';

interface DayCell {
  date: Date;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  bookings: any[];
  availableCars: any[];
}

interface AgendaGroup {
  date: Date;
  dateLabel: string;
  isToday: boolean;
  items: any[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {
  dir = 'ltr';
  loading = true;
  currentDate = new Date();
  weeks: DayCell[][] = [];
  reservations: any[] = [];
  voitures: any[] = [];
  clients: any[] = [];
  selectedDay: DayCell | null = null;
  filterStatus = 'all';

  activeCount = 0;
  thisMonthCount = 0;
  upcomingCount = 0;
  availableFleet = 0;

  isMobile = false;
  mobileView: 'month' | 'week' | 'day' | 'agenda' = 'month';
  weekCells: DayCell[] = [];
  agendaGroups: AgendaGroup[] = [];
  bottomSheetDay: DayCell | null = null;
  selectedDayView: Date = new Date();
  dayViewCell: DayCell | null = null;
  showMobileFilter = false;
  private touchStartX = 0;
  private touchStartY = 0;

  readonly skeletonArr = Array(42).fill(0);

  private monthNames: Record<string, string[]> = {
    en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    fr: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
    ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  };

  private monthNamesShort: Record<string, string[]> = {
    en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    fr: ['Jan','Fév','Mar','Avr','Mai','Jui','Jul','Aoû','Sep','Oct','Nov','Déc'],
    ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  };

  private dayNames: Record<string, string[]> = {
    en: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    fr: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],
    ar: ['أحد','إثن','ثلا','أرب','خمي','جمع','سبت'],
  };

  private dayNamesFull: Record<string, string[]> = {
    en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    fr: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
    ar: ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],
  };

  constructor(private crud: CrudService, private ts: TranslationService) {}

  ngOnInit() {
    this.isMobile = window.innerWidth < 768;
    this.ts.direction$.subscribe(d => this.dir = d);
    this.loadData();
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth < 768;
  }

  loadData() {
    this.loading = true;
    forkJoin({
      reservations: this.crud.getAll('reservation').pipe(catchError(() => of([]))),
      voitures:     this.crud.getAll('voiture').pipe(catchError(() => of([]))),
      clients:      this.crud.getAll('client').pipe(catchError(() => of([]))),
    }).subscribe(({ reservations, voitures, clients }) => {
      this.reservations = this.toArr(reservations);
      this.voitures     = this.toArr(voitures);
      this.clients      = this.toArr(clients);
      this.computeStats();
      this.buildCalendar();
      this.buildWeekView();
      this.buildAgendaView();
      this.buildDayView();
      this.loading = false;
    });
  }

  private toArr(r: any): any[] {
    return Array.isArray(r) ? r : (r?.data ?? r?.['hydra:member'] ?? []);
  }

  private computeStats() {
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const y = today.getFullYear(), m = today.getMonth();
    this.activeCount = this.reservations.filter(r => {
      const s = new Date(r.dateDebut); s.setHours(0,0,0,0);
      const e = new Date(r.dateFin);   e.setHours(23,59,59,999);
      return s <= today && e >= today;
    }).length;
    this.thisMonthCount = this.reservations.filter(r => {
      const d = new Date(r.dateDebut);
      return d.getFullYear() === y && d.getMonth() === m;
    }).length;
    this.upcomingCount = this.reservations.filter(r => {
      const s = new Date(r.dateDebut); s.setHours(0,0,0,0);
      return s > today;
    }).length;
    this.availableFleet = this.voitures.filter((v: any) =>
      v.voitureStatus === 'available' || v.voitureStatus === 'disponible'
    ).length;
  }

  buildCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev  = new Date(year, month, 0).getDate();
    const today = new Date();
    const cells: DayCell[] = [];

    for (let i = firstDay - 1; i >= 0; i--)
      cells.push(this.makeCell(new Date(year, month - 1, daysInPrev - i), false, today));
    for (let d = 1; d <= daysInMonth; d++)
      cells.push(this.makeCell(new Date(year, month, d), true, today));
    for (let d = 1; d <= 42 - cells.length; d++)
      cells.push(this.makeCell(new Date(year, month + 1, d), false, today));

    this.weeks = [];
    for (let i = 0; i < cells.length; i += 7)
      this.weeks.push(cells.slice(i, i + 7));
  }

  buildWeekView() {
    const d = new Date(this.currentDate);
    const dayOfWeek = d.getDay();
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - dayOfWeek);
    const today = new Date();
    this.weekCells = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      this.weekCells.push(this.makeCell(date, date.getMonth() === this.currentDate.getMonth(), today));
    }
  }

  buildAgendaView() {
    const today = new Date(); today.setHours(0,0,0,0);
    const source = this.filterStatus === 'all'
      ? this.reservations
      : this.reservations.filter(r => this.bookingStatusClass(r) === this.filterStatus);

    const sorted = [...source]
      .filter(r => {
        const e = new Date(r.dateFin); e.setHours(23,59,59,999);
        return e >= today;
      })
      .sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime());

    const groups = new Map<string, AgendaGroup>();
    for (const r of sorted) {
      const d = new Date(r.dateDebut); d.setHours(0,0,0,0);
      const key = d.toDateString();
      if (!groups.has(key)) {
        groups.set(key, {
          date: new Date(d),
          dateLabel: this.formatAgendaDate(d),
          isToday: d.toDateString() === today.toDateString(),
          items: []
        });
      }
      groups.get(key)!.items.push(r);
    }
    this.agendaGroups = Array.from(groups.values());
  }

  buildDayView() {
    const today = new Date();
    this.dayViewCell = this.makeCell(new Date(this.selectedDayView), true, today);
  }

  private formatAgendaDate(d: Date): string {
    const lang = this.ts.getCurrentLanguage();
    const daysFull = this.dayNamesFull[lang] || this.dayNamesFull['en'];
    const monthsShort = this.monthNamesShort[lang] || this.monthNamesShort['en'];
    return `${daysFull[d.getDay()]}, ${d.getDate()} ${monthsShort[d.getMonth()]}`;
  }

  private makeCell(date: Date, isCurrentMonth: boolean, today: Date): DayCell {
    const source = this.filterStatus === 'all'
      ? this.reservations
      : this.reservations.filter(r => this.bookingStatusClass(r) === this.filterStatus);

    const probe = new Date(date); probe.setHours(12,0,0,0);
    const overlapsDay = (r: any) => {
      const s = new Date(r.dateDebut); s.setHours(0,0,0,0);
      const e = new Date(r.dateFin);   e.setHours(23,59,59,999);
      return probe >= s && probe <= e;
    };

    const bookings = source.filter(overlapsDay);

    const bookedIds = new Set(
      this.reservations
        .filter(r => this.bookingStatusClass(r) !== 'cancelled')
        .filter(overlapsDay)
        .map(r => r.voitureId || r.voiture?.id)
    );
    const availableCars = this.voitures.filter(v =>
      !bookedIds.has(v.id) && (v.voitureStatus === 'available' || v.voitureStatus === 'disponible')
    );

    const day = date.getDay();
    return {
      date, dayNum: date.getDate(), isCurrentMonth,
      isToday:   date.toDateString() === today.toDateString(),
      isWeekend: day === 0 || day === 6,
      bookings,
      availableCars,
    };
  }

  prevMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.buildCalendar();
    this.buildWeekView();
    this.buildAgendaView();
  }

  nextMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.buildCalendar();
    this.buildWeekView();
    this.buildAgendaView();
  }

  prevWeek() {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() - 7);
    this.currentDate = d;
    this.buildWeekView();
  }

  nextWeek() {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() + 7);
    this.currentDate = d;
    this.buildWeekView();
  }

  prevDay() {
    const d = new Date(this.selectedDayView);
    d.setDate(d.getDate() - 1);
    this.selectedDayView = d;
    this.buildDayView();
  }

  nextDay() {
    const d = new Date(this.selectedDayView);
    d.setDate(d.getDate() + 1);
    this.selectedDayView = d;
    this.buildDayView();
  }

  mobilePrev() {
    switch (this.mobileView) {
      case 'month':  this.prevMonth(); break;
      case 'week':   this.prevWeek();  break;
      case 'day':    this.prevDay();   break;
      case 'agenda': this.prevMonth(); break;
    }
  }

  mobileNext() {
    switch (this.mobileView) {
      case 'month':  this.nextMonth(); break;
      case 'week':   this.nextWeek();  break;
      case 'day':    this.nextDay();   break;
      case 'agenda': this.nextMonth(); break;
    }
  }

  goToToday() {
    this.currentDate = new Date();
    this.selectedDayView = new Date();
    this.buildCalendar();
    this.buildWeekView();
    this.buildDayView();
    this.buildAgendaView();
  }

  setFilter(status: string) {
    this.filterStatus = status;
    this.showMobileFilter = false;
    this.buildCalendar();
    this.buildWeekView();
    this.buildAgendaView();
    this.buildDayView();
  }

  setMobileView(view: 'month' | 'week' | 'day' | 'agenda') {
    this.mobileView = view;
    this.bottomSheetDay = null;
  }

  get isViewingCurrentMonth(): boolean {
    const n = new Date();
    return this.currentDate.getFullYear() === n.getFullYear()
        && this.currentDate.getMonth()    === n.getMonth();
  }

  get isViewingToday(): boolean {
    return this.selectedDayView.toDateString() === new Date().toDateString();
  }

  get currentMonthLabel(): string {
    const lang  = this.ts.getCurrentLanguage();
    const names = this.monthNames[lang] || this.monthNames['en'];
    return `${names[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
  }

  get dayLabels(): string[] {
    const lang = this.ts.getCurrentLanguage();
    return this.dayNames[lang] || this.dayNames['en'];
  }

  get currentWeekLabel(): string {
    if (!this.weekCells.length) return '';
    const lang = this.ts.getCurrentLanguage();
    const months = this.monthNamesShort[lang] || this.monthNamesShort['en'];
    const first = this.weekCells[0].date;
    const last  = this.weekCells[6].date;
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()} – ${last.getDate()} ${months[last.getMonth()]} ${last.getFullYear()}`;
    }
    return `${first.getDate()} ${months[first.getMonth()]} – ${last.getDate()} ${months[last.getMonth()]} ${last.getFullYear()}`;
  }

  get currentDayLabel(): string {
    const lang = this.ts.getCurrentLanguage();
    const months = this.monthNamesShort[lang] || this.monthNamesShort['en'];
    const days   = this.dayNamesFull[lang]    || this.dayNamesFull['en'];
    const d = this.selectedDayView;
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  }

  get mobileHeaderLabel(): string {
    switch (this.mobileView) {
      case 'month':  return this.currentMonthLabel;
      case 'week':   return this.currentWeekLabel;
      case 'day':    return this.currentDayLabel;
      case 'agenda': return this.t('upcoming');
    }
  }

  private dayHasContent(day: DayCell): boolean {
    return this.filterStatus === 'available' ? day.availableCars.length > 0 : day.bookings.length > 0;
  }

  selectDay(day: DayCell) {
    if (!this.dayHasContent(day)) return;
    this.selectedDay = this.selectedDay?.date.toDateString() === day.date.toDateString() ? null : day;
  }

  selectMobileDay(day: DayCell) {
    if (this.dayHasContent(day)) {
      this.bottomSheetDay = day;
    } else {
      this.selectedDayView = new Date(day.date);
      this.buildDayView();
      this.mobileView = 'day';
    }
  }

  closeBottomSheet() { this.bottomSheetDay = null; }
  closeDay() { this.selectedDay = null; }

  @HostListener('document:keydown.escape') onEscape() {
    this.closeDay();
    this.closeBottomSheet();
    this.showMobileFilter = false;
  }

  onTouchStart(e: TouchEvent) {
    this.touchStartX = e.changedTouches[0].screenX;
    this.touchStartY = e.changedTouches[0].screenY;
  }

  onTouchEnd(e: TouchEvent) {
    const dx = this.touchStartX - e.changedTouches[0].screenX;
    const dy = Math.abs(this.touchStartY - e.changedTouches[0].screenY);
    if (Math.abs(dx) > 55 && dy < 80) {
      if (dx > 0) this.mobileNext();
      else        this.mobilePrev();
    }
  }

  getVoitureLabel(r: any): string {
    const v = this.voitures.find(v => v.id === (r.voitureId || r.voiture?.id));
    return v ? `${v.marque} ${v.modele}` : `#${r.voitureId || '?'}`;
  }

  carLabel(v: any): string {
    return `${v.marque} ${v.modele}`;
  }

  getClientName(r: any): string {
    const id = r.clientId || r.client?.id;
    const c  = this.clients.find(c => c.id === id);
    if (c) return `${c.prenom || ''} ${c.nom}`.trim();
    return r.client?.nom || `#${id || '?'}`;
  }

  bookingStatusClass(r: any): string {
    const s = (r.reservationStatus || r.statut || '').toLowerCase().replace(/ /g, '_');
    if (['confirmee', 'confirmed'].includes(s))                    return 'confirmed';
    if (['en_cours', 'active', 'encours'].includes(s))             return 'active';
    if (['terminee', 'completed', 'done', 'termine'].includes(s))  return 'completed';
    if (['annulee', 'cancelled', 'annule'].includes(s))            return 'cancelled';
    if (s === 'maintenance')                                        return 'maintenance';
    return 'pending';
  }

  t(key: string) { return this.ts.translate(key); }
}
