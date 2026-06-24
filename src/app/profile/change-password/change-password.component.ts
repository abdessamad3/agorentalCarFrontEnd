import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { TranslationService } from '../../services/translation.service';
import { environment } from '../../../environments/environment';

function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value || '';
  if (!v) return null;
  const missing: string[] = [];
  if (v.length < 8)                    missing.push('8+ characters');
  if (!/[A-Z]/.test(v))               missing.push('uppercase letter');
  if (!/[0-9]/.test(v))               missing.push('number');
  if (!/[^A-Za-z0-9]/.test(v))        missing.push('special character');
  return missing.length ? { strength: missing } : null;
}

function confirmPasswordValidator(group: AbstractControl): ValidationErrors | null {
  const np = group.get('newPassword')?.value;
  const cp = group.get('confirmPassword')?.value;
  return np && cp && np !== cp ? { mismatch: true } : null;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error = '';
  dir = 'ltr';
  isForcedChange = false;

  showCurrent = false;
  showNew = false;
  showConfirm = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private auth: AuthService,
    private toast: ToastService,
    private router: Router,
    private ts: TranslationService,
  ) {
    this.form = this.fb.group({
      currentPassword:  ['', Validators.required],
      newPassword:      ['', [Validators.required, passwordStrengthValidator]],
      confirmPassword:  ['', Validators.required],
    }, { validators: confirmPasswordValidator });
  }

  ngOnInit() {
    this.ts.direction$.subscribe(d => this.dir = d);
    this.isForcedChange = this.auth.mustChangePassword();
  }

  get np() { return this.form.get('newPassword'); }

  get strength(): number {
    const v: string = this.np?.value || '';
    let score = 0;
    if (v.length >= 8)              score++;
    if (/[A-Z]/.test(v))           score++;
    if (/[0-9]/.test(v))           score++;
    if (/[^A-Za-z0-9]/.test(v))    score++;
    return score;
  }

  get strengthLabel(): string {
    return ['', 'Weak', 'Fair', 'Good', 'Strong'][this.strength];
  }

  get strengthClass(): string {
    return ['', 'str-weak', 'str-fair', 'str-good', 'str-strong'][this.strength];
  }

  get req() {
    const v: string = this.np?.value || '';
    return {
      length:  v.length >= 8,
      upper:   /[A-Z]/.test(v),
      number:  /[0-9]/.test(v),
      special: /[^A-Za-z0-9]/.test(v),
    };
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.error = '';
    const { currentPassword, newPassword } = this.form.value;
    this.http.post(`${environment.apiUrl}/password/change`, { currentPassword, newPassword }).subscribe({
      next: () => {
        this.auth.clearMustChangePassword();
        this.toast.show('Password changed successfully', 'success');
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error = err?.error?.error || 'Failed to change password';
        this.loading = false;
      }
    });
  }
}
