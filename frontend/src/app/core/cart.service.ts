import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Replaces the `window.dispatchEvent(new CustomEvent("cartUpdated"))` pattern.
 * After ANY cart mutation, call `cart.refresh()` — the navbar badge reads `cart.count()`.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  readonly count = signal(0);

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) this.refresh();
      else this.count.set(0);
    });
  }

  async refresh() {
    if (!this.auth.isAuthenticated()) {
      this.count.set(0);
      return;
    }
    try {
      const data: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/carts`));
      this.count.set(data?.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0);
    } catch {
      this.count.set(0);
    }
  }
}
