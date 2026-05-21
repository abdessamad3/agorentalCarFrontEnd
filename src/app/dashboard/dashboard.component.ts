import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  stats: any = {
    totalVoitures: 0,
    availableVoitures: 0,
    activeReservations: 0,
    revenue: 0
  };

  reservations: any[] = [];
  loading = true;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.dashboardService.getStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Stats error:', err);
        this.loading = false;
      }
    });

    this.dashboardService.getRecentReservations().subscribe({
      next: (data) => {
        this.reservations = data.data || [];
      },
      error: (err) => {
        console.error('Reservations error:', err);
        this.reservations = [];
      }
    });
  }
}
