import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paginator.component.html',
  styleUrls: ['./paginator.component.css'],
})
export class PaginatorComponent {
  @Input() page  = 1;
  @Input() limit = 20;
  @Input() total = 0;
  @Output() pageChange = new EventEmitter<number>();

  get pages(): number { return Math.max(1, Math.ceil(this.total / this.limit)); }
  get from():  number { return this.total === 0 ? 0 : (this.page - 1) * this.limit + 1; }
  get to():    number { return Math.min(this.page * this.limit, this.total); }

  prev() { if (this.page > 1)           this.pageChange.emit(this.page - 1); }
  next() { if (this.page < this.pages)  this.pageChange.emit(this.page + 1); }
  go(p: number) { this.pageChange.emit(p); }

  get pageNumbers(): number[] {
    const p = this.pages;
    if (p <= 7) return Array.from({ length: p }, (_, i) => i + 1);
    if (this.page <= 4)     return [1, 2, 3, 4, 5, -1, p];
    if (this.page >= p - 3) return [1, -1, p - 4, p - 3, p - 2, p - 1, p];
    return [1, -1, this.page - 1, this.page, this.page + 1, -1, p];
  }
}
