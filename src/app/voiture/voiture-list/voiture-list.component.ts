import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VoitureService } from '../../services/voiture.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-voiture-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voiture-list.component.html',
  styleUrls: ['./voiture-list.component.css']
})
export class VoitureListComponent implements OnInit {
  voitures: any[] = [];
  loading = true;

  constructor(private voitureService: VoitureService, public router: Router) {}

  ngOnInit(): void {
    this.loadCars();
  }

  loadCars(): void {
    this.voitureService.getVoitures().subscribe({
      next: (data) => {
        this.voitures = data.map(v => ({
          ...v,
          // 2. Use environment.serverUrl
          fullImage: v.image.startsWith('http')
            ? v.image
            : environment.serverUrl + v.image
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  viewCar(id: number): void {
    this.router.navigate(['/voiture', id]);
  }
}
