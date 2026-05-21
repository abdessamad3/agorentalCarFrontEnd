import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/sidebar/sidebar.component';
import { TranslationService } from './services/translation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  isSidebarOpen = false;
  dir = 'ltr';

  constructor(private translationService: TranslationService) {
    // Subscribe to direction changes
    this.translationService.direction$.subscribe(dir => {
      this.dir = dir;
      document.documentElement.setAttribute('dir', dir);
    });
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    console.log('Sidebar toggled:', this.isSidebarOpen);
  }

  closeSidebar() {
    this.isSidebarOpen = false;
    console.log('Sidebar closed');
  }
}
