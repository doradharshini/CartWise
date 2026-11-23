import { HttpClient } from '@angular/common/http';
import { Component, Input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { CouponPreview } from './coupon-preview';

@Component({
  selector: 'app-page-admin-coupon-management',
  imports: [FormsModule, MatButtonModule, MatIconModule, CouponPreview],
  templateUrl: './admin-coupon-management.html',
  styleUrl: './admin-coupon-management.scss',
})
export class AdminCouponManagementPage {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  isLoading = signal(false);
  notification = signal<{ show: boolean; message: string; type: string }>({ show: false, message: '', type: '' });
  private notifTimer: any;

  formData = this.blankForm();

  readonly tips = [
    'Use memorable codes like DIWALI20 or FLAT200.',
    'Set a usage limit to prevent abuse.',
    'Percentage discounts work best for high-value carts.',
    'Flat discounts feel more concrete to customers.',
  ];

  private blankForm() {
    return { code: '', discountType: 'PERCENTAGE', discountValue: '' as any, expirationDate: '', usageLimit: '' as any };
  }

  /** Summary strip entries (recomputed each change-detection pass, same as React's render). */
  summary() {
    const f = this.formData;
    return [
      { icon: 'sell', label: 'Code', value: f.code ? f.code.toUpperCase() : '—' },
      {
        icon: 'percent',
        label: 'Value',
        value: f.discountValue ? (f.discountType === 'PERCENTAGE' ? `${f.discountValue}%` : `₹${f.discountValue}`) : '—',
      },
      {
        icon: 'calendar_today',
        label: 'Expires',
        value: f.expirationDate
          ? new Date(f.expirationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          : '—',
      },
      { icon: 'tag', label: 'Limit', value: f.usageLimit || '—' },
    ];
  }

  showNotification(message: string, type = 'error') {
    clearTimeout(this.notifTimer);
    this.notification.set({ show: true, message, type });
    this.notifTimer = setTimeout(() => this.notification.set({ show: false, message: '', type: '' }), 4000);
  }

  async handleSubmit() {
    this.isLoading.set(true);
    try {
      const payload = {
        ...this.formData,
        code: this.formData.code.toUpperCase().trim(),
        discountValue: parseFloat(this.formData.discountValue),
        usageLimit: parseInt(this.formData.usageLimit, 10),
      };
      const data: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/coupons`, payload, {
          headers: { 'X-User-Role': this.auth.user()?.role || 'ADMIN' },
        }),
      );
      this.showNotification(`Coupon ${data.code} created successfully!`, 'success');
      this.formData = this.blankForm();
    } catch (err) {
      this.showNotification(apiErrorMessage(err, 'Failed to create coupon.'), 'error');
    } finally {
      this.isLoading.set(false);
    }
  }
}
