import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { BureauService } from '../../services/bureauservice.service';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-bureau-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bureau-edit.component.html',
  styleUrls: ['./bureau-edit.component.css']
})
export class BureauEditComponent implements OnInit {
  bureauForm: FormGroup;
  loading = true;
  isSubmitting = false;
  error = '';
  bureauId: number | null = null;
  users: any[] = [];

  constructor(
    private fb: FormBuilder,
    private bureauService: BureauService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService,
    private http: HttpClient,
  ) {
    this.bureauForm = this.fb.group({
      nom: ['', Validators.required],
      adresse: [''],
      statut: ['actif', Validators.required],
      managerId: [null]
    });
  }

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/utilisateur?limit=100`).subscribe({
      next: (r) => { this.users = Array.isArray(r) ? r : (r?.data ?? []); }
    });
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.bureauId = params['id'];
        this.loadBureau(params['id']);
      }
    });
  }

  get managers(): any[] {
    return this.users.filter(u => (u.roles || []).includes('ROLE_MANAGER'));
  }

  loadBureau(id: number): void {
    this.bureauService.getBureauById(id).subscribe({
      next: (data) => {
        this.bureauForm.patchValue({
          nom: data.nom,
          adresse: data.adresse,
          statut: data.statut,
          managerId: data.managerId ?? null
        });
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load bureau';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.bureauForm.invalid || !this.bureauId) {
      this.toast.show('Please fill all required fields', 'warning');
      return;
    }

    this.isSubmitting = true;

    this.bureauService.updateBureau(this.bureauId, this.bureauForm.value).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.show('Bureau updated successfully!', 'success');
        this.router.navigate(['/bureau', this.bureauId]);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.show(err.error?.message || 'Failed to update bureau', 'error');
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/bureau', this.bureauId]);
  }
}
