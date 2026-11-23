import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

interface StatusCfg {
  icon: string;
  label: string;
  /** Modifier suffix for .orders-badge--<variant> in order-card.scss */
  variant: string;
}

const STATUS_CONFIG: Record<string, StatusCfg> = {
  PLACED: { icon: 'schedule', label: 'Placed', variant: 'placed' },
  PROCESSING: { icon: 'schedule', label: 'Processing', variant: 'processing' },
  SHIPPED: { icon: 'local_shipping', label: 'Shipped', variant: 'shipped' },
  DELIVERED: { icon: 'check_circle', label: 'Delivered', variant: 'delivered' },
  CANCELLED: { icon: 'cancel', label: 'Cancelled', variant: 'cancelled' },
};

/** One order in the "My Orders" list (presentational). */
@Component({
  selector: 'app-order-card',
  imports: [MatButtonModule, MatCardModule, MatDividerModule, MatIconModule],
  templateUrl: './order-card.html',
  styleUrl: './order-card.scss',
})
export class OrderCard {
  readonly order = input.required<any>();
  /** Emitted for "View Order" / "Track Package". */
  readonly view = output<void>();
  /** Emitted with the line item to review (delivered orders only). */
  readonly review = output<any>();

  formatPrice(price: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
  }

  formatDate(dateString: string) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  statusCfg(status: string): StatusCfg | null {
    return STATUS_CONFIG[status?.toUpperCase()] || null;
  }

  badgeVariant(status: string) {
    return this.statusCfg(status)?.variant || 'unknown';
  }

  totalItems() {
    return this.order().orderLineItems?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;
  }
}
