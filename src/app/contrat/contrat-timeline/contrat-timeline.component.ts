import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contrat-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contrat-timeline.component.html',
  styleUrls: ['./contrat-timeline.component.css'],
})
export class ContratTimelineComponent {
  @Input() timeline: any[] = [];
  @Input() status = '';
  @Output() deliveryClick = new EventEmitter<void>();
  @Output() returnClick   = new EventEmitter<void>();

  readonly stageIcons: Record<string, string> = {
    created:   '✦',
    confirmed: '✔',
    delivered: '⬆',
    active:    '▶',
    returned:  '⬇',
    closed:    '■',
  };

  isClickable(step: any): boolean {
    return step.completed && (step.stage === 'delivered' || step.stage === 'returned' || step.stage === 'closed');
  }

  onStepClick(step: any) {
    if (!step.completed) return;
    if (step.stage === 'delivered' || step.stage === 'active') this.deliveryClick.emit();
    if (step.stage === 'returned' || step.stage === 'closed') this.returnClick.emit();
  }

  isCurrent(step: any): boolean {
    const statusMap: Record<string, string> = {
      confirmed: 'confirmed',
      en_cours:  'active',
      terminee:  'closed',
    };
    return statusMap[this.status] === step.stage;
  }
}
