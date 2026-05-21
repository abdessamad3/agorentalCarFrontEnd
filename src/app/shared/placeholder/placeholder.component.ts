import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="placeholder-container">
      <div class="placeholder-content">
        <span class="placeholder-icon">🚀</span>
        <h2>{{ title }}</h2>
        <p>{{ message }}</p>
      </div>
    </div>
  `,
  styles: [`
    .placeholder-container {
      padding: 4rem 2rem;
      text-align: center;
      color: #718096;
    }

    .placeholder-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .placeholder-icon {
      font-size: 3rem;
      display: block;
    }

    h2 {
      color: #4a5568;
      margin: 0;
    }

    p {
      color: #718096;
      margin: 0;
    }
  `]
})
export class PlaceholderComponent {
  title = 'Feature Coming Soon';
  message = 'This feature is under development';
}
