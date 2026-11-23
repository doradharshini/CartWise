import { HttpClient } from '@angular/common/http';
import { Component, NgZone, computed, inject, signal } from '@angular/core';
import { CheckoutSummary } from './checkout-summary';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';

// ── Fee rules (must mirror order-service's calculation exactly, or the
// amount shown here, the amount charged via Razorpay, and the amount stored
// as the order's totalAmount will all disagree) ──
const PLATFORM_FEE_COD = 9;
const DELIVERY_FEE = 49;
const FREE_DELIVERY_THRESHOLD = 500;

const loadRazorpayScript = () =>
  new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

@Component({
  selector: 'app-page-checkout',
  imports: [MatIconModule, CheckoutSummary],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class CheckoutPage {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private cart = inject(CartService);
  private zone = inject(NgZone);

  readonly FREE_DELIVERY_THRESHOLD = FREE_DELIVERY_THRESHOLD;
  readonly PLATFORM_FEE_COD = PLATFORM_FEE_COD;
  readonly trustItems = [
    { icon: 'lock', label: '256-bit SSL encryption' },
    { icon: 'verified_user', label: '100% secure checkout' },
    { icon: 'local_shipping', label: 'Fast & reliable delivery' },
    { icon: 'inventory_2', label: 'Easy 7-day returns' },
  ];
  readonly paymentOptions = [
    { value: 'CREDIT_CARD', icon: 'credit_card', label: 'Online Payment', sub: 'Powered by Razorpay' },
    { value: 'COD', icon: 'payments', label: 'Cash on Delivery', sub: `+${this.formatPrice(PLATFORM_FEE_COD)} platform fee` },
  ];

  private directSku = this.route.snapshot.queryParamMap.get('directSku');
  private directQty = parseInt(this.route.snapshot.queryParamMap.get('qty') || '') || 1;

  addresses = signal<any[]>([]);
  cartItems = signal<any[]>([]);
  isLoading = signal(true);
  isPlacingOrder = signal(false);
  selectedAddressId = signal<any>('');
  paymentMethod = signal('CREDIT_CARD');
  couponCode = signal('');
  appliedCoupon = signal('');
  discountData = signal<any>(null);
  isApplyingCoupon = signal(false);
  notification = signal({ show: false, message: '', type: '' });
  private notifTimer: any;

  subtotal = computed(() => this.cartItems().reduce((s, i) => s + i.snapshotPrice * i.quantity, 0));
  discountAmount = computed(() => {
    const d = this.discountData();
    const subtotal = this.subtotal();
    let amount = 0;
    if (d) {
      if (d.discountType === 'PERCENTAGE') amount = subtotal * (d.discountValue / 100);
      else if (d.discountType === 'FLAT_AMOUNT') amount = d.discountValue;
      if (amount > subtotal) amount = subtotal;
    }
    return amount;
  });
  discountedSubtotal = computed(() => this.subtotal() - this.discountAmount());
  // The only two fees: ₹49 delivery under ₹500 (free at/above it), and a
  // flat ₹9 platform fee, but only for Cash on Delivery orders.
  deliveryFee = computed(() => (this.discountedSubtotal() >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE));
  platformFee = computed(() => (this.paymentMethod() === 'COD' ? PLATFORM_FEE_COD : 0));
  total = computed(() => this.discountedSubtotal() + this.deliveryFee() + this.platformFee());

  constructor() {
    this.fetchCheckoutData();
  }

  formatPrice(price: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
  }

  showNotification(message: string, type = 'error') {
    clearTimeout(this.notifTimer);
    this.notification.set({ show: true, message, type });
    this.notifTimer = setTimeout(() => this.notification.set({ show: false, message: '', type: '' }), 4000);
  }

  private async fetchCheckoutData() {
    const token = localStorage.getItem('accessToken');
    if (!this.auth.isAuthenticated() && !token) {
      this.router.navigate(['/login']);
      return;
    }
    try {
      try {
        const addrData = await firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/users/addresses`));
        this.addresses.set(addrData || []);
        if (addrData && addrData.length > 0) this.selectedAddressId.set(addrData[0].id);
      } catch {
        /* React ignored a non-ok address response */
      }

      if (this.directSku) {
        const prodData: any = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/products`));
        const products: any[] = prodData.content || prodData || [];
        const target = products.find((p) => p.skuCode === this.directSku);
        if (!target) throw new Error('Product not found.');
        this.cartItems.set([
          {
            skuCode: target.skuCode,
            productId: target.id,
            name: target.name,
            imageUrl: target.imageUrl,
            quantity: this.directQty,
            snapshotPrice: target.price,
          },
        ]);
      } else {
        let cartData: any;
        try {
          cartData = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/carts`));
        } catch {
          throw new Error('Failed to load cart.');
        }
        const rawItems = cartData?.items || [];
        if (rawItems.length === 0) {
          this.router.navigate(['/cart']);
          return;
        }
        const prodData: any = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/products`));
        const products: any[] = prodData.content || prodData || [];
        this.cartItems.set(
          rawItems.map((ci: any) => {
            const p = products.find((x) => x.skuCode === ci.skuCode);
            return { ...ci, name: p?.name || 'Unknown Product', imageUrl: p?.imageUrl || '' };
          }),
        );
      }
    } catch (err: any) {
      this.showNotification(err.message, 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  async handleApplyCoupon() {
    const code = this.couponCode().trim();
    if (!code) return;
    this.isApplyingCoupon.set(true);
    try {
      let data: any;
      try {
        data = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/coupons/validate/${code.toUpperCase()}`));
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Invalid or expired coupon code.'));
      }
      this.discountData.set(data);
      this.appliedCoupon.set(data.code);
      this.showNotification('Coupon applied successfully!', 'success');
    } catch (err: any) {
      this.showNotification(err.message, 'error');
      this.discountData.set(null);
      this.appliedCoupon.set('');
    } finally {
      this.isApplyingCoupon.set(false);
    }
  }

  removeCoupon() {
    this.appliedCoupon.set('');
    this.couponCode.set('');
    this.discountData.set(null);
  }

  private async createPaymentIntentWithRetry(orderId: any, maxRetries = 5): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const data: any = await firstValueFrom(
          this.http.post<any>(`${environment.apiUrl}/payments/create-intent/${orderId}`, null),
        );
        return data.razorpayOrderId;
      } catch (e: any) {
        const errData = e?.error && typeof e.error === 'object' ? e.error : {};
        if (e?.status === 404) {
          if (errData.retryable === 'true' && attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 1500 * attempt));
            continue;
          }
          throw new Error(errData.error || 'Payment service is not ready. Please try again.');
        }
        if (e?.status === 502) {
          throw new Error(errData.error || 'Payment gateway is unavailable. Please try again later.');
        }
        throw new Error('Failed to initialize payment gateway.');
      }
    }
    throw new Error('Payment service is still initializing. Please wait a moment and try again.');
  }

  async handlePlaceOrder() {
    if (!this.selectedAddressId()) {
      this.showNotification('Please select or add a shipping address.', 'error');
      return;
    }
    this.isPlacingOrder.set(true);
    try {
      const isDirectFlow = !!this.directSku;
      const endpoint = isDirectFlow ? 'orders/direct' : 'orders';
      const base = {
        addressId: this.selectedAddressId(),
        paymentMethod: this.paymentMethod(),
        couponCode: this.appliedCoupon() || null,
      };
      const payload = isDirectFlow ? { ...base, skuCode: this.directSku, quantity: this.directQty } : base;

      let orderData: any;
      try {
        orderData = await firstValueFrom(this.http.post<any>(`${environment.apiUrl}/${endpoint}`, payload));
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to place order.'));
      }
      if (!orderData.orderId) throw new Error(orderData.error || orderData.message || 'Failed to place order.');
      const realDbId = orderData.orderId;

      if (!isDirectFlow) this.cart.refresh();

      if (this.paymentMethod() === 'COD') {
        this.showNotification('Order placed successfully!', 'success');
        setTimeout(() => this.router.navigate(['/order-lifecycle', realDbId], { queryParams: { success: 'true' } }), 1500);
      } else {
        const sdkLoaded = await loadRazorpayScript();
        if (!sdkLoaded) throw new Error('Razorpay SDK failed to load. Are you online?');
        const rzpOrderId = await this.createPaymentIntentWithRetry(realDbId);
        const user: any = this.auth.user();
        const options = {
          key: environment.razorpayKeyId,
          amount: Math.round(this.total() * 100),
          currency: 'INR',
          name: 'Cartwise',
          description: 'Purchase transaction',
          order_id: rzpOrderId,
          handler: () => {
            this.zone.run(() => {
              this.showNotification('Payment Successful!', 'success');
              this.router.navigate(['/order-lifecycle', realDbId], { queryParams: { success: 'true' } });
            });
          },
          prefill: {
            name: user?.firstName || 'Customer',
            email: user?.email || '',
          },
          theme: { color: '#0f172a' },
          modal: {
            ondismiss: async () => {
              this.zone.run(() => this.showNotification('Payment cancelled.', 'error'));
              try {
                await firstValueFrom(this.http.put(`${environment.apiUrl}/orders/${realDbId}/cancel`, null, { responseType: 'text' }));
              } catch (e) {
                console.error('[Checkout] Failed to cancel abandoned order:', e);
              }
            },
          },
        };
        const paymentObject = new (window as any).Razorpay(options);
        paymentObject.on('payment.failed', () => {
          this.zone.run(() => this.showNotification('Payment Failed. Please try again.', 'error'));
        });
        paymentObject.open();
        this.isPlacingOrder.set(false);
      }
    } catch (err: any) {
      this.showNotification(err.message, 'error');
      this.isPlacingOrder.set(false);
    }
  }

  goCart() {
    this.router.navigate(['/cart']);
  }
  goAddresses() {
    this.router.navigate(['/addresses']);
  }
}
