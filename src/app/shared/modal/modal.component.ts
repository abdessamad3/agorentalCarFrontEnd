import { Component, Input, Output, EventEmitter, HostListener, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class ModalComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon = '';
  @Input() iconColor: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'gray' = 'blue';
  @Input() maxWidth = '540px';
  @Input() dir = '';
  @Output() closed = new EventEmitter<void>();

  close(): void { this.closed.emit(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.close(); }
}
