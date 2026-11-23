import { HttpClient } from '@angular/common/http';
import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { WishlistService } from '../../core/wishlist.service';

@Component({
  selector: 'app-page-wishlist',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class WishlistPage {
  private http = inject(HttpClient);
  private router = inject(Router);
  private auth = inject(AuthService);
  private cart = inject(CartService);
  private wishlist = inject(WishlistService);

  products = signal<any[]>([]);
  isLoading = signal(true);
  addingSku = signal<string | null>(null);
  removingSku = signal<string | null>(null);
  brokenImages = signal<Set<string>>(new Set());
  notification = signal<{ show: boolean; message: string; type: string }>({ show: false, message: '', type: '' });

  constructor() {
    // Re-filter the catalog whenever the wishlist changes (same as React's [wishlistSkus] effect).
    effect(() => {
      const skus = this.wishlist.wishlistSkus();
      void this.fetchWishlistProducts(skus);
    });
  }

  formatPrice(price: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
  }

  categoryName(p: any) {
    return typeof p.category === 'string' ? p.category : p.category?.name || 'Item';
  }

  private showNotification(message: string, type = 'error') {
    this.notification.set({ show: true, message, type });
    setTimeout(() => this.notification.set({ show: false, message: '', type: '' }), 3000);
  }

  private async fetchWishlistProducts(skus: string[]) {
    try {
      const data: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/products`));
      const catalog = data?.content || data || [];
      this.products.set(catalog.filter((p: any) => skus.includes(p.skuCode)));
    } catch {
      this.showNotification('Failed to load catalog products.', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  markBroken(sku: string) {
    this.brokenImages.update((s) => new Set(s).add(sku));
  }

  async handleAddToCart(e: Event, skuCode: string) {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!this.auth.isAuthenticated() && !token) {
      this.router.navigate(['/login']);
      return;
    }
    this.addingSku.set(skuCode);
    try {
      let stock = 0;
      try {
        const invText = await firstValueFrom(
          this.http.get(`${environment.apiUrl}/inventory/${skuCode}`, { responseType: 'text' }),
        );
        try {
          stock = JSON.parse(invText).availableQuantity || 0;
        } catch {
          stock = parseInt(invText) || 0;
        }
      } catch {
        stock = 0;
      }
      if (stock <= 0) throw new Error('Sorry, this item is out of stock!');
      try {
        await firstValueFrom(this.http.post(`${environment.apiUrl}/carts/add`, { skuCode, quantity: 1 }));
      } catch {
        throw new Error('Failed to update cart.');
      }
      this.cart.refresh();
      this.showNotification('Moved item into your cart!', 'success');
    } catch (err) {
      this.showNotification(apiErrorMessage(err), 'error');
    } finally {
      this.addingSku.set(null);
    }
  }

  handleRemove(skuCode: string) {
    this.removingSku.set(skuCode);
    setTimeout(() => {
      void this.wishlist.toggle(skuCode);
      this.removingSku.set(null);
    }, 300);
  }

  browse() {
    this.router.navigate(['/catalog']);
  }
}
