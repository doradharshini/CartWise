import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { VerifyEmailModal } from './verify-email-modal';

const KNOWN_ROLES = ['ADMIN', 'USER', 'MODERATOR'];

@Component({
  selector: 'app-page-profile',
  imports: [ReactiveFormsModule, MatButtonModule, MatIconModule, VerifyEmailModal],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfilePage implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  profileData = signal<any>(null);
  isLoading = signal(true);
  isSaving = signal(false);
  error = signal('');
  successMsg = signal('');
  showVerifyModal = signal(false);
  submitted = signal(false);
  private successTimer: any;

  form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.minLength(10)]],
  });

  /** Zod messages from the React schema. */
  fieldError(name: 'firstName' | 'lastName' | 'email' | 'phoneNumber'): string {
    const c = this.form.controls[name];
    if (!(c.touched || this.submitted()) || !c.errors) return '';
    switch (name) {
      case 'firstName':
        return 'First name must be at least 2 characters.';
      case 'lastName':
        return 'Last name must be at least 2 characters.';
      case 'email':
        return 'Please enter a valid email address.';
      default:
        return 'Please enter a valid phone number.';
    }
  }

  async ngOnInit() {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    try {
      const data = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/users/profile`));
      this.profileData.set(data);
      this.form.reset({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber,
      });
    } catch (err) {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        this.auth.logout();
        this.router.navigate(['/login']);
        this.error.set('Session expired. Please log in again.');
      } else {
        this.error.set('Failed to fetch profile data.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  ngOnDestroy() {
    clearTimeout(this.successTimer);
  }

  private flashSuccess(msg: string) {
    this.successMsg.set(msg);
    clearTimeout(this.successTimer);
    this.successTimer = setTimeout(() => this.successMsg.set(''), 4000);
  }

  async onSubmit() {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.isSaving.set(true);
    this.error.set('');
    this.successMsg.set('');
    const values = this.form.getRawValue();
    try {
      await firstValueFrom(
        this.http.put(`${environment.apiUrl}/users/profile`, values, {
          headers: { 'X-User-Id': String(this.profileData().id) },
        }),
      );
      this.flashSuccess('Profile updated successfully!');
      this.profileData.update((prev) => ({ ...prev, ...values }));
    } catch (err) {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        this.auth.logout();
        this.router.navigate(['/login']);
        this.error.set('Session expired. Please log in again.');
      } else {
        this.error.set(apiErrorMessage(err, 'Failed to update profile.'));
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  handleVerified() {
    this.showVerifyModal.set(false);
    this.profileData.update((prev) => ({ ...prev, emailVerified: true }));
    this.flashSuccess('Email verified successfully!');
  }

  // ── View helpers ──
  get initials() {
    const p = this.profileData();
    return `${(p?.firstName || '?')[0]}${(p?.lastName || '')[0] ?? ''}`.toUpperCase();
  }

  get fullName() {
    const p = this.profileData();
    return `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim();
  }

  get joinDate() {
    const p = this.profileData();
    return p?.createdAt
      ? new Date(p.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '—';
  }

  /** Modifier suffix for the role badge (admin | user | moderator | other). */
  get roleKey() {
    const role = this.profileData()?.role?.toUpperCase();
    return KNOWN_ROLES.includes(role) ? role.toLowerCase() : 'other';
  }
}
