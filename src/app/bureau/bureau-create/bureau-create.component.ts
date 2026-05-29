import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BureauService } from '../../services/bureauservice.service';

@Component({
  selector: 'app-bureau-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bureau-create.component.html',
  styleUrls: ['./bureau-create.component.css']
})
export class BureauCreateComponent {
  bureauForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private bureauService: BureauService,
    private router: Router
  ) {
    this.bureauForm = this.fb.group({
      nom: ['', Validators.required],
      adresse: [''],
      statut: ['actif', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.bureauForm.invalid) {
      alert('Please fill all required fields');
      return;
    }

    this.isSubmitting = true;

    this.bureauService.createBureau(this.bureauForm.value).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        alert('Bureau added successfully!');
        this.router.navigate(['/bureau']);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('❌ Error:', err);
        alert('Error: ' + (err.error?.message || 'Failed to create bureau'));
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/bureau']);
  }
}
