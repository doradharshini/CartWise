import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-page-become-seller',
  imports: [FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './become-seller.html',
  styleUrl: './become-seller.scss',
})
export class BecomeSellerPage implements OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  auth = inject(AuthService);

  readonly perks = [
    { icon: 'storefront', label: 'Create your storefront', desc: 'Set up your brand and start listing products in minutes.' },
    { icon: 'trending_up', label: 'Reach nationwide buyers', desc: 'Put your products in front of millions of active daily shoppers.' },
    { icon: 'verified', label: 'Secure & fast payouts', desc: 'Get paid on time with our reliable merchant settlement system.' },
    { icon: 'groups', label: 'Dedicated seller support', desc: 'Access 24/7 support and exclusive tools to grow your business.' },
  ];

  shopName = '';
  shopDescription = '';
  isSubmitting = signal(false);
  error = signal('');
  success = signal(false);
  countdown = signal(3);
  private timer: any;

  constructor() {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }

  async handleSubmit() {
    this.error.set('');
    this.isSubmitting.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/users/become-seller`, {
          shopName: this.shopName,
          shopDescription: this.shopDescription,
        }),
      );
      this.success.set(true);
      let secs = 3;
      this.timer = setInterval(() => {
        secs -= 1;
        this.countdown.set(secs);
        if (secs <= 0) {
          clearInterval(this.timer);
          this.auth.logout();
          this.router.navigate(['/login']);
        }
      }, 1000);
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Failed to register shop. The name might be taken.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }
}
