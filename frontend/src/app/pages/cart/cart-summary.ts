import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

/** Order summary sidebar + free-delivery promo for the cart page (presentational). */
@Component({
  selector: 'app-cart-summary',
  imports: [MatButtonModule, MatCardModule, MatDividerModule, MatIconModule],
  templateUrl: './cart-summary.html',
  styleUrl: './cart-summary.scss',
})
export class CartSummary {
  readonly subtotal = input.required<number>();
  readonly deliveryFee = input.required<number>();
  readonly total = input.required<number>();
  readonly freeDeliveryThreshold = input.required<number>();
  readonly checkout = output<void>();

  formatPrice(price: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
  }
}
