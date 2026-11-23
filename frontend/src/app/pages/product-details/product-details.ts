import { HttpClient } from '@angular/common/http';
import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { WishlistService } from '../../core/wishlist.service';
import { ProductReviews } from '../../shared/product-reviews/product-reviews';

const SWIPE_DISTANCE_THRESHOLD = 60; // px
const SWIPE_VELOCITY_THRESHOLD = 400; // px/s

@Component({
  selector: 'app-page-product-details',
  imports: [MatButtonModule, MatIconModule, ProductReviews],
  templateUrl: './product-details.html',
  styleUrl: './product-details.scss',
})
export class ProductDetailsPage {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private cart = inject(CartService);
  private wishlist = inject(WishlistService);

  readonly trustItems = [
    { icon: 'local_shipping', label: 'Free delivery over ₹499' },
    { icon: 'verified_user', label: '1 Year Brand Warranty' },
    { icon: 'replay', label: '7-Day Easy Returns' },
    { icon: 'verified', label: '100% Authentic' },
  ];

  id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id'))), { initialValue: null });

  product = signal<any>(null);
  isLoading = signal(true);
  error = signal('');
  isAdding = signal(false);
  quantity = signal(1);
  zoomed = signal(false);
  imgError = signal(false);
  wishlistBounce = signal(false);
  activeImageIndex = signal(0);
  notification = signal<{ show: boolean; message: string; type: string }>({ show: false, message: '', type: '' });

  // Full gallery — falls back to the single cover image for older products, or [] (placeholder).
  images = computed<string[]>(() => {
    const p = this.product();
    if (p?.imageUrls?.length > 0) return p.imageUrls;
    return p?.imageUrl ? [p.imageUrl] : [];
  });
  activeImageUrl = computed(() => this.images()[this.activeImageIndex()] || '');
  saved = computed(() => {
    const p = this.product();
    return p ? this.wishlist.wishlistSkus().includes(p.skuCode) : false;
  });
  categoryName = computed(() => {
    const c = this.product()?.category;
    return typeof c === 'string' ? c : c?.name || 'Uncategorized';
  });

  private dragStart: { x: number; t: number } | null = null;

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) void this.fetchProduct(id);
    });
  }

  formatPrice(price: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
  }

  private showNotification(message: string, type = 'error') {
    this.notification.set({ show: true, message, type });
    setTimeout(() => this.notification.set({ show: false, message: '', type: '' }), 3000);
  }

  private async fetchProduct(id: string) {
    this.isLoading.set(true);
    this.error.set('');
    try {
      const p = await firstValueFrom(this.http.get(`${environment.apiUrl}/products/${id}`));
      this.product.set(p);
      this.activeImageIndex.set(0);
      this.imgError.set(false);
    } catch (err: any) {
      this.error.set(err?.status === 404 ? 'Product not found.' : 'Failed to fetch product details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  goToImage(index: number) {
    const n = this.images().length;
    if (n === 0) return;
    this.activeImageIndex.set(((index % n) + n) % n);
    this.imgError.set(false);
  }
  goPrev() {
    this.goToImage(this.activeImageIndex() - 1);
  }
  goNext() {
    this.goToImage(this.activeImageIndex() + 1);
  }

  // Swipe support (replaces framer-motion drag): pointer distance + velocity thresholds.
  onPointerDown(e: PointerEvent) {
    if (this.images().length <= 1) return;
    this.dragStart = { x: e.clientX, t: performance.now() };
  }
  onPointerUp(e: PointerEvent) {
    if (!this.dragStart) return;
    const dx = e.clientX - this.dragStart.x;
    const dt = Math.max(1, performance.now() - this.dragStart.t) / 1000;
    const vx = dx / dt;
    this.dragStart = null;
    if (dx < -SWIPE_DISTANCE_THRESHOLD || vx < -SWIPE_VELOCITY_THRESHOLD) this.goNext();
    else if (dx > SWIPE_DISTANCE_THRESHOLD || vx > SWIPE_VELOCITY_THRESHOLD) this.goPrev();
  }

  // Keyboard navigation while zoomed in
  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (!this.zoomed()) return;
    if (e.key === 'ArrowLeft') this.goPrev();
    if (e.key === 'ArrowRight') this.goNext();
    if (e.key === 'Escape') this.zoomed.set(false);
  }

  decQty() {
    this.quantity.update((q) => Math.max(1, q - 1));
  }
  incQty() {
    this.quantity.update((q) => Math.min(20, q + 1));
  }

  async handleAddToCart() {
    const token = localStorage.getItem('accessToken');
    if (!this.auth.isAuthenticated() && !token) {
      this.router.navigate(['/login']);
      return;
    }
    const product = this.product();
    this.isAdding.set(true);
    try {
      let stock = 0;
      try {
        const invText = await firstValueFrom(
          this.http.get(`${environment.apiUrl}/inventory/${product.skuCode}`, { responseType: 'text' }),
        );
        try {
          const d = JSON.parse(invText);
          stock = d.availableQuantity ?? d.quantity ?? 0;
        } catch {
          stock = parseInt(invText) || 0;
        }
      } catch {
        stock = 0;
      }
      if (stock <= 0) throw new Error('Sorry, this item is currently out of stock!');
      try {
        await firstValueFrom(
          this.http.post(`${environment.apiUrl}/carts/add`, { skuCode: product.skuCode, quantity: this.quantity() }),
        );
      } catch {
        throw new Error('Failed to add to cart');
      }
      this.cart.refresh();
      this.showNotification('Added to your cart!', 'success');
    } catch (err) {
      this.showNotification(apiErrorMessage(err), 'error');
    } finally {
      this.isAdding.set(false);
    }
  }

  buyNow() {
    this.router.navigate(['/checkout'], {
      queryParams: { directSku: this.product().skuCode, qty: this.quantity() },
    });
  }

  handleWishlist(e?: Event) {
    e?.preventDefault();
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    void this.wishlist.toggle(this.product().skuCode);
    this.wishlistBounce.set(true);
    setTimeout(() => this.wishlistBounce.set(false), 400);
  }

  back() {
    this.router.navigate(['/catalog']);
  }
}
