import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BureauService } from '../../services/bureauservice.service';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-bureau-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bureau-create.component.html',
  styleUrls: ['./bureau-create.component.css']
})
export class BureauCreateComponent implements OnInit {
  bureauForm: FormGroup;
  isSubmitting = false;
  users: any[] = [];

  constructor(
    private fb: FormBuilder,
    private bureauService: BureauService,
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
  }

  get managers(): any[] {
    return this.users.filter(u => (u.roles || []).includes('ROLE_MANAGER'));
  }

  onSubmit(): void {
    if (this.bureauForm.invalid) {
      this.toast.show('Please fill all required fields', 'warning');
      return;
    }

    this.isSubmitting = true;

    this.bureauService.createBureau(this.bureauForm.value).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.show('Bureau added successfully!', 'success');
        this.router.navigate(['/bureau']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.show(err.error?.message || 'Failed to create bureau', 'error');
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/bureau']);
  }
}
