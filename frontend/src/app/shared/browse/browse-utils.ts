import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CartService } from '../../core/cart.service';

export const SORT_OPTIONS = [
  { label: 'Default', value: 'default' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Name: A → Z', value: 'name_asc' },
  { label: 'Name: Z → A', value: 'name_desc' },
];

export const sortLabel = (value: string) => SORT_OPTIONS.find((o) => o.value === value)?.label;

export const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);

/** Client-side sort, returns a new array. */
export function sortProducts(list: any[], sort: string): any[] {
  return [...list].sort((a, b) => {
    if (sort === 'price_asc') return a.price - b.price;
    if (sort === 'price_desc') return b.price - a.price;
    if (sort === 'name_asc') return a.name.localeCompare(b.name);
    if (sort === 'name_desc') return b.name.localeCompare(a.name);
    return 0;
  });
}

/** Category name for filtering (no fallback). */
export const categoryName = (p: any): string | undefined =>
  typeof p.category === 'string' ? p.category : p.category?.name;

/** Category label for display. */
export const categoryLabel = (p: any): string => categoryName(p) || 'Uncategorized';

export interface Notification {
  show: boolean;
  message: string;
  type: string;
}

/**
 * The "check inventory, then POST /carts/add" flow shared by Home, Catalog,
 * CategoryView and SearchResults. Throws Error(message) on failure.
 */
@Injectable({ providedIn: 'root' })
export class QuickAddService {
  private http = inject(HttpClient);
  private cart = inject(CartService);

  async add(
    skuCode: string,
    opts: { outOfStock?: string; failed?: string; quantityFallback?: boolean } = {},
  ): Promise<void> {
    const { outOfStock = 'Sorry, this item is currently out of stock!', failed = 'Failed to add to cart', quantityFallback = true } = opts;

    let stock = 0;
    try {
      const invText = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/inventory/${skuCode}`, { responseType: 'text' }),
      );
      try {
        const d = JSON.parse(invText);
        stock = quantityFallback ? (d.availableQuantity ?? d.quantity ?? 0) : d.availableQuantity || 0;
      } catch {
        stock = parseInt(invText) || 0;
      }
    } catch {
      stock = 0;
    }
    if (stock <= 0) throw new Error(outOfStock);

    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/carts/add`, { skuCode, quantity: 1 }));
    } catch {
      throw new Error(failed);
    }
    this.cart.refresh();
  }
}
