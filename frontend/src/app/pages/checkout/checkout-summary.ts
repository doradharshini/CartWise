import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/** Order summary panel for the checkout page: items, coupon, price breakdown and the pay button (presentational). */
@Component({
  selector: 'app-checkout-summary',
  imports: [FormsModule, MatButtonModule, MatDividerModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './checkout-summary.html',
  styleUrl: './checkout-summary.scss',
})
export class CheckoutSummary {
  readonly items = input.required<any[]>();
  readonly hasAddresses = input.required<boolean>();
  readonly subtotal = input.required<number>();
  readonly discountAmount = input.required<number>();
  readonly appliedCoupon = input.required<string>();
  readonly deliveryFee = input.required<number>();
  readonly platformFee = input.required<number>();
  readonly total = input.required<number>();
  readonly freeDeliveryThreshold = input.required<number>();
  readonly isApplyingCoupon = input.required<boolean>();
  readonly isPlacingOrder = input.required<boolean>();
  readonly couponCode = model('');

  readonly applyCoupon = output<void>();
  readonly removeCoupon = output<void>();
  readonly placeOrder = output<void>();

  formatPrice(price: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
  }
}
