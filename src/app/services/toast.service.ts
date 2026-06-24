import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  removing: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  show(message: string, type: Toast['type'] = 'info', duration = 4000) {
    const id = ++this.counter;
    const toast: Toast = { id, message, type, removing: false };
    this.toastsSubject.next([...this.toastsSubject.getValue(), toast]);
    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: number) {
    // Mark as removing to trigger CSS exit animation
    this.toastsSubject.next(
      this.toastsSubject.getValue().map(t => t.id === id ? { ...t, removing: true } : t)
    );
    // Remove from DOM after animation completes
    setTimeout(() => {
      this.toastsSubject.next(this.toastsSubject.getValue().filter(t => t.id !== id));
    }, 350);
  }
}
