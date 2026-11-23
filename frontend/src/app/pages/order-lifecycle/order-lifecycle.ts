import { HttpClient } from '@angular/common/http';
import { Component, Input, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';

// Each lifecycle step gets its own accent colour (mapped to palette variables in TimelineStep's styles).
const STEP_ACCENTS = ['blue', 'amber', 'violet', 'emerald'];

/** Port of the TimelineStep sub-component. */
@Component({
  selector: 'app-timeline-step',
  imports: [MatIconModule],
  template: `
    <div class="step step--{{ accent }}" [class.step--active]="active">
      <div class="step__rail">
        <div class="step__dot" [style.animation-delay.ms]="300 + index * 180">
          <mat-icon class="step__icon">{{ icon }}</mat-icon>
          @if (active && !last) {
            <span class="step__pulse"></span>
          }
        </div>

        @if (!last) {
          <div class="step__track">
            <div
              class="step__fill"
              [style.height]="lineActive ? '100%' : '0%'"
              [style.transition-delay.ms]="350 + index * 180"
            ></div>
          </div>
        }
      </div>

      <div class="step__text" [class.step__text--last]="last" [style.animation-delay.ms]="index * 70">
        <p class="step__label">{{ label }}</p>
        @if (sublabel && active) {
          <p class="step__sublabel">{{ sublabel }}</p>
        }
      </div>
    </div>
  `,
  styles: `
    @keyframes dotIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    @keyframes pulse { from { transform: scale(1); opacity: 0.6; } to { transform: scale(1.65); opacity: 0; } }
    @keyframes textIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }

    :host { display: block; }

    .step--blue { --c-solid: var(--blue-600); --c-solid-dark: var(--blue-500); --c-line: var(--blue-500); --c-line-dark: var(--blue-400); --c-pulse: var(--blue-400); --c-pulse-dark: var(--blue-300); --c-label: var(--blue-700); --c-label-dark: var(--blue-400); --c-glow: var(--blue-200); --c-glow-dark: var(--blue-900); }
    .step--amber { --c-solid: var(--amber-500); --c-solid-dark: var(--amber-400); --c-line: var(--amber-500); --c-line-dark: var(--amber-400); --c-pulse: var(--amber-400); --c-pulse-dark: var(--amber-300); --c-label: var(--amber-700); --c-label-dark: var(--amber-400); --c-glow: var(--amber-200); --c-glow-dark: var(--amber-900); }
    .step--violet { --c-solid: var(--violet-600); --c-solid-dark: var(--violet-500); --c-line: var(--violet-500); --c-line-dark: var(--violet-400); --c-pulse: var(--violet-400); --c-pulse-dark: var(--violet-300); --c-label: var(--violet-700); --c-label-dark: var(--violet-400); --c-glow: var(--violet-200); --c-glow-dark: var(--violet-900); }
    .step--emerald { --c-solid: var(--emerald-600); --c-solid-dark: var(--emerald-500); --c-line: var(--emerald-500); --c-line-dark: var(--emerald-400); --c-pulse: var(--emerald-400); --c-pulse-dark: var(--emerald-300); --c-label: var(--emerald-700); --c-label-dark: var(--emerald-400); --c-glow: var(--emerald-200); --c-glow-dark: var(--emerald-900); }

    .step { position: relative; display: flex; gap: 1.5rem; }
    .step__rail { display: flex; flex-direction: column; align-items: center; }

    .step__dot {
      position: relative; z-index: 10; flex-shrink: 0;
      width: 2.25rem; height: 2.25rem;
      display: flex; justify-content: center; align-items: center;
      border-radius: var(--radius-full);
      background: var(--neutral-100); color: var(--neutral-400);
      border: 2px solid var(--neutral-200);
      box-shadow: var(--shadow-md);
      animation: dotIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    :host-context(.dark) .step__dot { background: var(--neutral-800); color: var(--neutral-600); border-color: var(--neutral-700); }
    .step--active .step__dot { background: var(--c-solid); color: #fff; border-color: transparent; box-shadow: 0 4px 6px -1px var(--c-glow), 0 2px 4px -2px var(--c-glow); }
    :host-context(.dark) .step--active .step__dot { background: var(--c-solid-dark); box-shadow: 0 4px 6px -1px var(--c-glow-dark), 0 2px 4px -2px var(--c-glow-dark); }
    .step__icon { width: 1rem; height: 1rem; font-size: 1rem; }

    .step__pulse {
      position: absolute; inset: 0;
      border-radius: var(--radius-full);
      border: 2px solid var(--c-pulse);
      animation: pulse 1.7s ease-out infinite;
    }
    :host-context(.dark) .step__pulse { border-color: var(--c-pulse-dark); }

    .step__track {
      position: relative; flex: 1; width: 0.125rem; min-height: 44px; margin-top: 0.125rem;
      overflow: hidden; border-radius: var(--radius-full);
      background: color-mix(in oklab, var(--neutral-200) 60%, transparent);
    }
    :host-context(.dark) .step__track { background: color-mix(in oklab, var(--neutral-700) 60%, transparent); }
    .step__fill {
      position: absolute; top: 0; left: 0; right: 0;
      border-radius: var(--radius-full);
      background: var(--c-line);
      transition: height 0.6s cubic-bezier(0.22, 1, 0.36, 1);
    }
    :host-context(.dark) .step__fill { background: var(--c-line-dark); }

    .step__text {
      display: flex; flex-direction: column; gap: 0.25rem;
      margin-top: 0.25rem; padding-bottom: 2.25rem;
      animation: textIn 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .step__text--last { padding-bottom: 0; }
    .step__label { margin: 0; font-size: 1rem; line-height: 1.5rem; font-weight: 700; color: var(--neutral-400); }
    :host-context(.dark) .step__label { color: var(--neutral-600); }
    .step--active .step__label { color: var(--c-label); }
    :host-context(.dark) .step--active .step__label { color: var(--c-label-dark); }
    .step__sublabel { margin: 0; font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; color: var(--neutral-500); }
    :host-context(.dark) .step__sublabel { color: var(--neutral-400); }

    @media (prefers-reduced-motion: reduce) {
      .step__dot, .step__pulse, .step__text { animation: none; }
      .step__fill { transition: none; }
    }
  `,
})
export class TimelineStep {
  @Input() icon = 'check';
  @Input() label = '';
  @Input() sublabel = '';
  @Input() active = false;
  @Input() lineActive = false;
  @Input() last = false;
  @Input() index = 0;
  get accent() {
    return STEP_ACCENTS[this.index] || STEP_ACCENTS[0];
  }
}

@Component({
  selector: 'app-page-order-lifecycle',
  imports: [MatButtonModule, MatCardModule, MatDividerModule, MatIconModule, TimelineStep],
  templateUrl: './order-lifecycle.html',
  styleUrl: './order-lifecycle.scss',
})
export class OrderLifecyclePage {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  private readonly id = this.route.snapshot.paramMap.get('id');
  readonly isNewOrder = this.route.snapshot.queryParamMap.get('success') === 'true';

  order = signal<any>(null);
  isLoading = signal(true);
  error = signal('');

  currentStatus = computed(() => this.order()?.orderStatus?.toUpperCase() || 'PLACED');
  isCancelled = computed(() => this.currentStatus() === 'CANCELLED');
  stepPlaced = computed(() => !this.isCancelled());
  stepProcessing = computed(
    () => this.stepPlaced() && ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(this.currentStatus()),
  );
  stepShipped = computed(() => this.stepProcessing() && ['SHIPPED', 'DELIVERED'].includes(this.currentStatus()));
  stepDelivered = computed(() => this.stepShipped() && this.currentStatus() === 'DELIVERED');

  subtotal = computed(() =>
    (this.order()?.orderLineItems || []).reduce((s: number, i: any) => s + i.price * i.quantity, 0),
  );
  isFreeShipping = computed(() => this.subtotal() > 1000);
  /** Shipping shown in the summary (same rule as React: ₹100 flat unless subtotal > ₹1000). */
  shipping = computed(() => (this.isFreeShipping() ? 0 : 100));
  hasDiscount = computed(() => this.order()?.totalPrice < this.subtotal() + this.shipping());
  discount = computed(() => this.subtotal() + this.shipping() - this.order()?.totalPrice);

  constructor() {
    void this.fetchOrderDetails();
  }

  formatPrice(price: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price || 0);
  }

  formatDate(dateString: string) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /** Modifier suffix for .summary__pay-status--<variant>. */
  paymentStatusVariant(status: string) {
    if (status === 'COMPLETED') return 'completed';
    if (status === 'FAILED') return 'failed';
    return 'pending';
  }

  paymentLabel(order: any) {
    return order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod?.replace('_', ' ');
  }

  private async fetchOrderDetails() {
    const token = localStorage.getItem('accessToken');
    if (!this.auth.isAuthenticated() && !token) {
      this.router.navigate(['/login']);
      return;
    }
    try {
      let orderData: any = null;
      try {
        orderData = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/orders/${this.id}`));
      } catch {
        try {
          const history = await firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/orders`));
          orderData = history.find((o) => o.orderNumber === this.id || o.id === this.id);
        } catch {
          /* fall through to "Order not found." */
        }
      }
      if (!orderData) throw new Error('Order not found.');

      const prodData: any = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/products`));
      const catalog: any[] = prodData.content || prodData || [];
      const enrichedItems = (orderData.orderLineItems || []).map((item: any) => {
        const matched = catalog.find((p) => p.skuCode === item.skuCode);
        return { ...item, imageUrl: matched?.imageUrl || '', name: matched?.name || 'Product Item' };
      });
      this.order.set({ ...orderData, orderLineItems: enrichedItems });
    } catch (err: any) {
      this.error.set(err.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  goOrders() {
    this.router.navigate(['/orders']);
  }
  goCatalog() {
    this.router.navigate(['/catalog']);
  }
}
