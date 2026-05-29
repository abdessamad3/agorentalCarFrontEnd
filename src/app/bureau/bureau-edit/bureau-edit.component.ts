import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BureauService } from '../../services/bureauservice.service';

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

  constructor(
    private fb: FormBuilder,
    private bureauService: BureauService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.bureauForm = this.fb.group({
      nom: ['', Validators.required],
      adresse: [''],
      statut: ['actif', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.bureauId = params['id'];
        this.loadBureau(params['id']);
      }
    });
  }

  loadBureau(id: number): void {
    this.bureauService.getBureauById(id).subscribe({
      next: (data) => {
        this.bureauForm.patchValue({
          nom: data.nom,
          adresse: data.adresse,
          statut: data.statut
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error:', err);
        this.error = 'Failed to load bureau';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.bureauForm.invalid || !this.bureauId) {
      alert('Please fill all required fields');
      return;
    }

    this.isSubmitting = true;

    this.bureauService.updateBureau(this.bureauId, this.bureauForm.value).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        alert('Bureau updated successfully!');
        this.router.navigate(['/bureau', this.bureauId]);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('❌ Error:', err);
        alert('Error: ' + (err.error?.message || 'Failed to update bureau'));
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/bureau', this.bureauId]);
  }
}
