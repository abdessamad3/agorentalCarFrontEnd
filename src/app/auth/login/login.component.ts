import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['admin@autoloc.ma', [Validators.required, Validators.email]],
      password: ['Admin@123', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.errorMessage = 'Form is invalid';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { email, password } = this.loginForm.value;

    console.log('🔵 Attempting login with:', email);

    this.authService.login(email, password).subscribe({
      next: (response) => {
        console.log('✅ LOGIN SUCCESS');
        console.log('Response:', response);
        console.log('Token from response:', response.token);
        console.log('Token in localStorage:', localStorage.getItem('auth_token'));
        console.log('Token from service:', this.authService.getToken());

        this.isLoading = false;
        this.successMessage = 'Login successful! Redirecting...';

        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1000);
      },
      error: (err) => {
        console.error('❌ LOGIN FAILED');
        console.error('Error:', err);
        console.error('Error message:', err.error?.message);
        console.error('Error status:', err.status);

        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Login failed. Please try again.';
      }
    });
  }
}
