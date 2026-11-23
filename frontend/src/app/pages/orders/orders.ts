import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';
import { RateReviewDialog } from '../../shared/rate-review-dialog/rate-review-dialog';
import { OrderCard } from './order-card';

@Component({
  selector: 'app-page-orders',
  imports: [FormsModule, MatButtonModule, MatIconModule, OrderCard],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class OrdersPage {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  readonly STATUS_TABS = ['ALL', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  readonly skeletonRows = [1, 2, 3];

  orders = signal<any[]>([]);
  isLoading = signal(true);
  error = signal('');
  activeFilter = signal('ALL');
  searchQuery = signal('');
  notification = signal({ show: false, message: '', type: '' });
  private notifTimer: any;

  filteredOrders = computed(() => {
    const filter = this.activeFilter();
    const q = this.searchQuery().trim().toLowerCase();
    return this.orders().filter((order) => {
      if (filter === 'PROCESSING') {
        if (order.orderStatus !== 'PROCESSING' && order.orderStatus !== 'PLACED') return false;
      } else if (filter !== 'ALL' && order.orderStatus !== filter) {
        return false;
      }
      if (q) {
        return (
          order.orderNumber?.toLowerCase().includes(q) ||
          order.orderLineItems?.some((i: any) => i.skuCode?.toLowerCase().includes(q))
        );
      }
      return true;
    });
  });

  constructor() {
    void this.fetchOrdersAndProducts();
  }

  showNotification(message: string, type = 'error') {
    clearTimeout(this.notifTimer);
    this.notification.set({ show: true, message, type });
    this.notifTimer = setTimeout(() => this.notification.set({ show: false, message: '', type: '' }), 3000);
  }

  getCountForStatus(group: string) {
    const orders = this.orders();
    if (group === 'ALL') return orders.length;
    if (group === 'PROCESSING') return orders.filter((o) => o.orderStatus === 'PROCESSING' || o.orderStatus === 'PLACED').length;
    return orders.filter((o) => o.orderStatus === group).length;
  }

  private async fetchOrdersAndProducts() {
    const token = localStorage.getItem('accessToken');
    if (!this.auth.isAuthenticated() && !token) {
      this.router.navigate(['/login']);
      return;
    }
    try {
      let ordersData: any[];
      try {
        ordersData = await firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/orders`));
      } catch {
        throw new Error('Failed to load your order history.');
      }
      const prodData: any = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/products`));
      const catalog: any[] = prodData.content || prodData || [];
      this.orders.set(
        ordersData.map((order) => ({
          ...order,
          orderLineItems: (order.orderLineItems || []).map((item: any) => {
            const matched = catalog.find((p) => p.skuCode === item.skuCode);
            return { ...item, imageUrl: matched?.imageUrl || '', name: matched?.name || 'Product Item' };
          }),
        })),
      );
    } catch (err: any) {
      this.error.set(err.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  openReview(item: any) {
    this.dialog
      .open(RateReviewDialog, {
        data: { skuCode: item.skuCode, productName: item.name },
        maxWidth: '28rem',
        width: '100%',
      })
      .afterClosed()
      .subscribe((submitted) => {
        if (submitted) this.showNotification('Review published!', 'success');
      });
  }

  view(order: any) {
    this.router.navigate(['/order-lifecycle', order.id]);
  }

  clearFilters() {
    this.searchQuery.set('');
    this.activeFilter.set('ALL');
  }
}
