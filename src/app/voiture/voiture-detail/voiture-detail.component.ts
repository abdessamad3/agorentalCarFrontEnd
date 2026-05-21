import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VoitureService } from '../../services/voiture.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-voiture-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voiture-detail.component.html',
  styleUrls: ['./voiture-detail.component.css']
})
export class VoitureDetailComponent implements OnInit {
  carId: number = 0;
  car: any = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private voitureService: VoitureService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.carId = +this.route.snapshot.paramMap.get('id')!;
    this.loadCarDetails();
  }

  loadCarDetails(): void {
    this.voitureService.getVoitureById(this.carId).subscribe({
      next: (data) => {
        this.car = data;

        // 2. Use environment.serverUrl
        if (this.car.image && !this.car.image.startsWith('http')) {
            this.car.image = environment.serverUrl + this.car.image;
        }

        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        alert('خطأ في تحميل البيانات');
        this.router.navigate(['/voiture-list']);
      }
    });
  }
}
