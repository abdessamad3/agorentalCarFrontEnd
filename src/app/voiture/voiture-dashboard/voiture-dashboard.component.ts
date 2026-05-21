import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-voiture-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './voiture-dashboard.component.html',
  styleUrls: ['./voiture-dashboard.component.css']
})
export class VoitureDashboardComponent {

  subMenuItems = [
    { link: 'list', icon: '📋', key: 'list' },
    { link: 'create', icon: '➕', key: 'addCar' },
    { link: 'finance', icon: '💰', key: 'finance' },
    { link: 'users', icon: '👥', key: 'users' }
  ];

  constructor(public translationService: TranslationService) {}

  getLabel(key: string): string {
    return this.translationService.translate(key);
  }
}
