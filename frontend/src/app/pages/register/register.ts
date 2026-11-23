import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from '../../core/api-error';

@Component({
  selector: 'app-page-register',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterPage {
  private http = inject(HttpClient);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  apiError = signal('');
  isLoading = signal(false);
  success = signal(false);

  form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [Validators.required, Validators.minLength(4)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.minLength(10)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  get c() {
    return this.form.controls;
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    this.apiError.set('');
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/users/register`, this.form.getRawValue()));
      this.success.set(true);
      setTimeout(() => this.router.navigate(['/login']), 1600);
    } catch (err) {
      this.apiError.set(apiErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      this.isLoading.set(false);
    }
  }
}
