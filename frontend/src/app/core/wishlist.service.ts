import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/** Port of WishlistContext: wishlistSkus() signal, toggle(sku), isSaved(sku), refresh(). */
@Injectable({ providedIn: 'root' })
export class WishlistService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  readonly wishlistSkus = signal<string[]>([]);

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) this.refresh();
      else this.wishlistSkus.set([]);
    });
  }

  async refresh() {
    if (!this.auth.accessToken) return;
    try {
      const data = await firstValueFrom(this.http.get<string[]>(`${environment.apiUrl}/wishlist`));
      this.wishlistSkus.set(data || []);
    } catch (e) {
      console.error('Failed to load wishlist entries', e);
    }
  }

  isSaved(sku: string) {
    return this.wishlistSkus().includes(sku);
  }

  /** Optimistic toggle; rolls back by refetching on failure. Resolves true on success. */
  async toggle(skuCode: string): Promise<boolean> {
    if (!this.auth.accessToken) return false;
    const saved = this.isSaved(skuCode);
    this.wishlistSkus.update((l) => (saved ? l.filter((c) => c !== skuCode) : [...l, skuCode]));
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/wishlist/toggle`, { skuCode }));
      return true;
    } catch {
      await this.refresh();
      return false;
    }
  }
}
