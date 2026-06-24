import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BureauService } from '../../services/bureauservice.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-bureau-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bureau-detail.component.html',
  styleUrls: ['./bureau-detail.component.css']
})
export class BureauDetailComponent implements OnInit {
  bureau: any = null;
  loading = true;
  error = '';

  constructor(
    private bureauService: BureauService,
    private route: ActivatedRoute,
    public router: Router,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadBureau(params['id']);
      }
    });
  }

  loadBureau(id: number): void {
    this.bureauService.getBureauById(id).subscribe({
      next: (data:any) => {
        this.bureau = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load bureau';
        this.loading = false;
      }
    });
  }

  editBureau(): void {
    this.router.navigate(['/bureau', this.bureau.id, 'edit']);
  }

  deleteBureau(): void {
    if (confirm('Are you sure you want to delete this bureau?')) {
      this.bureauService.deleteBureau(this.bureau.id).subscribe({
        next: () => {
          this.toast.show('Bureau deleted successfully!', 'success');
          this.router.navigate(['/bureau']);
        },
        error: (err) => {
          this.toast.show(err.error?.message || 'Failed to delete bureau', 'error');
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/bureau']);
  }
}
