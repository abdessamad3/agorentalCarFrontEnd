import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, AfterViewInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import flatpickr from 'flatpickr';
import { French } from 'flatpickr/dist/l10n/fr';
import type { Instance } from 'flatpickr/dist/types/instance';

/** Single input that opens a two-month range calendar (pick the start date, then the
 *  end date, in one view) instead of two separate single-date inputs. Fires
 *  rangeChange only once both ends are picked. */
@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  template: `<input #inputEl readonly [placeholder]="placeholder" [class]="className" />`,
  styles: [`
    input {
      padding: 0.42rem 0.7rem;
      border: 1px solid var(--clr-border, #cbd5e0);
      border-radius: 6px;
      font-size: 0.84rem;
      font-family: inherit;
      color: var(--clr-text-2, #2d3748);
      background: var(--clr-white, white);
      cursor: pointer;
      transition: border-color 0.2s;
      min-width: 220px;
    }
    input:focus {
      outline: none;
      border-color: var(--clr-primary, #3182ce);
      box-shadow: 0 0 0 3px var(--clr-primary-ring, rgba(49,130,206,0.1));
    }
  `],
})
export class DateRangePickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() from = '';
  @Input() to = '';
  @Input() minDate: string | null = 'today';
  @Input() placeholder = '';
  @Input() className = '';
  @Output() rangeChange = new EventEmitter<{ from: string; to: string }>();

  @ViewChild('inputEl', { static: true }) inputEl!: ElementRef<HTMLInputElement>;

  private fp: Instance | null = null;

  ngAfterViewInit(): void {
    this.fp = flatpickr(this.inputEl.nativeElement, {
      mode: 'range',
      dateFormat: 'Y-m-d',
      showMonths: window.innerWidth < 640 ? 1 : 2,
      defaultDate: this.from && this.to ? [this.from, this.to] : undefined,
      minDate: this.minDate ?? undefined,
      disableMobile: true,
      locale: French,
      onChange: (dates) => {
        if (dates.length === 2) {
          const fmt = (d: Date) => flatpickr.formatDate(d, 'Y-m-d');
          this.rangeChange.emit({ from: fmt(dates[0]), to: fmt(dates[1]) });
        }
      },
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.fp) return;
    if (changes['minDate']) {
      this.fp.set('minDate', this.minDate ?? undefined);
    }
    if (changes['from'] || changes['to']) {
      if (!this.from && !this.to) {
        this.fp.clear();
      } else if (this.from && this.to) {
        this.fp.setDate([this.from, this.to], false);
      }
    }
  }

  ngOnDestroy(): void {
    this.fp?.destroy();
    this.fp = null;
  }
}
