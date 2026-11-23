import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';

// Each card gets one of these accents (palette variables are mapped in addresses.scss).
const ACCENTS = ['blue', 'violet', 'emerald', 'amber', 'rose', 'cyan'];

const emptyForm = () => ({ street: '', city: '', state: '', zipCode: '', country: '' });

@Component({
  selector: 'app-page-addresses',
  imports: [FormsModule, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './addresses.html',
  styleUrl: './addresses.scss',
})
export class AddressesPage {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly auth = inject(AuthService);

  readonly skeletonCards = [1, 2, 3];

  addresses = signal<any[]>([]);
  isLoading = signal(true);
  error = signal('');
  showForm = signal(false);
  isSubmitting = signal(false);
  formData = emptyForm();
  notification = signal({ show: false, message: '', type: '' });
  private notifTimer: any;

  constructor() {
    if (!this.auth.isAuthenticated() && !localStorage.getItem('accessToken')) {
      this.router.navigate(['/login']);
      return;
    }
    void this.fetchAddresses();
  }

  accent(index: number) {
    return ACCENTS[index % ACCENTS.length];
  }

  showNotification(message: string, type = 'error') {
    clearTimeout(this.notifTimer);
    this.notification.set({ show: true, message, type });
    this.notifTimer = setTimeout(() => this.notification.set({ show: false, message: '', type: '' }), 3000);
  }

  async fetchAddresses() {
    try {
      if (!localStorage.getItem('accessToken')) throw new Error('Authentication required.');
      try {
        const data = await firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/users/addresses`));
        this.addresses.set(data || []);
      } catch (e: any) {
        if (e?.status === 404) {
          this.addresses.set([]);
          return;
        }
        throw new Error('Failed to fetch addresses.');
      }
    } catch (err: any) {
      this.error.set(err.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  async handleSubmit() {
    this.isSubmitting.set(true);
    try {
      try {
        await firstValueFrom(this.http.post(`${environment.apiUrl}/users/addresses`, this.formData));
      } catch {
        throw new Error('Failed to save address.');
      }
      this.showNotification('Address saved successfully!', 'success');
      this.formData = emptyForm();
      this.showForm.set(false);
      await this.fetchAddresses();
    } catch (err: any) {
      this.showNotification(err.message, 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  back() {
    this.location.back();
  }
}
