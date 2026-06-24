import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast, ToastService } from '../../services/toast.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div
        *ngFor="let toast of toasts$ | async; trackBy: trackById"
        class="toast toast--{{ toast.type }}"
        [class.toast--removing]="toast.removing"
        (click)="toastService.dismiss(toast.id)"
      >
        <span class="toast__icon">{{ icons[toast.type] }}</span>
        <span class="toast__message">{{ toast.message }}</span>
        <button class="toast__close" (click)="$event.stopPropagation(); toastService.dismiss(toast.id)">✕</button>
      </div>
    </div>
  `,
  styleUrls: ['./toast.component.css']
})
export class ToastComponent implements OnInit {
  toasts$!: Observable<Toast[]>;

  readonly icons: Record<Toast['type'], string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  constructor(public toastService: ToastService) {}

  ngOnInit() {
    this.toasts$ = this.toastService.toasts$;
  }

  trackById(_: number, toast: Toast) {
    return toast.id;
  }
}
