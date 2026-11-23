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
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-page-login',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginPage {
  private http = inject(HttpClient);
  private router = inject(Router);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  apiError = signal('');
  isLoading = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  get email() {
    return this.form.controls.email;
  }
  get password() {
    return this.form.controls.password;
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    this.apiError.set('');
    try {
      const data: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/users/login`, this.form.getRawValue()),
      );
      this.auth.login(data.accessToken, data.refreshToken);
      this.router.navigate(['/catalog']);
    } catch (err) {
      this.apiError.set(apiErrorMessage(err, 'Invalid email or password.'));
    } finally {
      this.isLoading.set(false);
    }
  }
}
