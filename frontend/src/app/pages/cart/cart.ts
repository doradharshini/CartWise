import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CartSummary } from './cart-summary';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from '../../core/api-error';
import { CartService } from '../../core/cart.service';

// Accent names map to palette variables in cart.scss (.cart-item--<accent>).
const CATEGORY_ACCENTS: Record<string, string> = {
  electronics: 'blue',
  clothing: 'violet',
  fashion: 'violet',
  food: 'emerald',
  grocery: 'emerald',
  sports: 'amber',
  beauty: 'rose',
  home: 'cyan',
  books: 'orange',
};
const FALLBACK_ACCENTS = ['blue', 'violet', 'emerald', 'amber', 'rose', 'cyan'];

const DELIVERY_FEE = 49;
const FREE_DELIVERY_THRESHOLD = 500;

@Component({
  selector: 'app-page-cart',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule, CartSummary],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class CartPage {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);

  readonly FREE_DELIVERY_THRESHOLD = FREE_DELIVERY_THRESHOLD;
  readonly skeletonRows = [1, 2, 3];

  cartItems = signal<any[]>([]);
  isLoading = signal(true);
  error = signal('');
  isProcessing = signal(false);
  notification = signal({ show: false, message: '', type: '' });
  private notifTimer: any;

  subtotal = computed(() => this.cartItems().reduce((s, i) => s + i.snapshotPrice * i.quantity, 0));
  deliveryFee = computed(() => (this.subtotal() >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE));
  total = computed(() => this.subtotal() + this.deliveryFee());

  constructor() {
    if (!localStorage.getItem('accessToken')) {
      this.router.navigate(['/login']);
      return;
    }
    void this.fetchCartData();
  }

  formatPrice(price: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
  }

  getItemAccent(item: any, index: number): string {
    const key = (item.category || '').toLowerCase().trim();
    for (const [k, v] of Object.entries(CATEGORY_ACCENTS)) {
      if (key.includes(k)) return v;
    }
    return FALLBACK_ACCENTS[index % FALLBACK_ACCENTS.length];
  }

  showNotification(message: string, type = 'error') {
    clearTimeout(this.notifTimer);
    this.notification.set({ show: true, message, type });
    this.notifTimer = setTimeout(() => this.notification.set({ show: false, message: '', type: '' }), 3000);
  }

  async fetchCartData() {
    try {
      if (!localStorage.getItem('accessToken')) throw new Error('Please log in to view your cart.');
      let cartData: any;
      try {
        cartData = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/carts`));
      } catch (e: any) {
        if (e?.status === 404) {
          this.cartItems.set([]);
          this.isLoading.set(false);
          return;
        }
        throw new Error('Failed to fetch cart details.');
      }
      const rawItems = cartData?.items || [];
      if (rawItems.length === 0) {
        this.cartItems.set([]);
        this.isLoading.set(false);
        return;
      }
      const prodData: any = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/products`));
      const products: any[] = prodData.content || prodData || [];
      this.cartItems.set(
        rawItems.map((cartItem: any) => {
          const p = products.find((x) => x.skuCode === cartItem.skuCode);
          return {
            ...cartItem,
            productId: p?.id,
            name: p?.name || 'Unknown Product',
            imageUrl: p?.imageUrl || '',
            category: p?.category?.name || p?.category || 'Misc',
          };
        }),
      );
    } catch (err: any) {
      this.error.set(err.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateQuantity(skuCode: string, change: number) {
    this.isProcessing.set(true);
    try {
      if (change > 0) {
        let stock = 0;
        try {
          const invText = await firstValueFrom(
            this.http.get(`${environment.apiUrl}/inventory/${skuCode}`, { responseType: 'text' }),
          );
          try {
            const invData = JSON.parse(invText);
            stock = invData.availableQuantity ?? invData.quantity ?? 0;
          } catch {
            stock = parseInt(invText) || 0;
          }
        } catch {
          /* stock stays 0 */
        }
        const currentItem = this.cartItems().find((i) => i.skuCode === skuCode);
        if (currentItem && currentItem.quantity >= stock) throw new Error(`Cannot add more. Only ${stock} left in stock!`);
      }
      const endpoint = change > 0 ? 'carts/add' : 'carts/decrease';
      try {
        await firstValueFrom(this.http.post(`${environment.apiUrl}/${endpoint}`, { skuCode, quantity: 1 }));
      } catch {
        throw new Error('Failed to update quantity.');
      }
      await this.fetchCartData();
      void this.cart.refresh();
    } catch (err: any) {
      this.showNotification(err.message, 'error');
    } finally {
      this.isProcessing.set(false);
    }
  }

  async handleRemove(skuCode: string) {
    this.isProcessing.set(true);
    try {
      try {
        await firstValueFrom(this.http.delete(`${environment.apiUrl}/carts/items/${skuCode}`, { responseType: 'text' }));
      } catch {
        throw new Error('Failed to remove item.');
      }
      await this.fetchCartData();
      void this.cart.refresh();
      this.showNotification('Item removed from cart.', 'success');
    } catch (err: any) {
      this.showNotification(apiErrorMessage(err), 'error');
    } finally {
      this.isProcessing.set(false);
    }
  }

  goCatalog() {
    this.router.navigate(['/catalog']);
  }
  goCheckout() {
    this.router.navigate(['/checkout']);
  }
  reload() {
    window.location.reload();
  }
}
