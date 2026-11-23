import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';

const STATUS_CONFIG: Record<string, { icon: string; label: string; mod: string }> = {
  PLACED: {
    icon: 'schedule',
    label: 'Placed',
    mod: 'placed',
  },
  PROCESSING: {
    icon: 'schedule',
    label: 'Processing',
    mod: 'processing',
  },
  SHIPPED: {
    icon: 'local_shipping',
    label: 'Shipped',
    mod: 'shipped',
  },
  DELIVERED: {
    icon: 'check_circle',
    label: 'Delivered',
    mod: 'delivered',
  },
  CANCELLED: {
    icon: 'cancel',
    label: 'Cancelled',
    mod: 'cancelled',
  },
};

@Component({
  selector: 'app-page-admin-orders',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './admin-orders.html',
  styleUrl: './admin-orders.scss',
})
export class AdminOrdersPage implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private auth = inject(AuthService);

  readonly statusTabs = ['ALL', 'PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  orders = signal<any[]>([]);
  isLoading = signal(true);
  error = signal('');
  activeFilter = signal('ALL');
  searchQuery = signal('');
  updatingOrderId = signal<any>(null);
  notification = signal<{ show: boolean; message: string; type: string }>({ show: false, message: '', type: '' });
  /** userId -> { firstName, lastName, email }, resolved in one batch after orders load. */
  buyerInfo = signal<Record<string, any>>({});
  private notifTimer: any;

  filteredOrders = computed(() => {
    const filter = this.activeFilter();
    const query = this.searchQuery().trim();
    const info = this.buyerInfo();
    return this.orders().filter((order) => {
      if (filter !== 'ALL' && order.orderStatus !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        const buyer = info[order.userId];
        const matchesOrder = order.orderNumber?.toLowerCase().includes(q);
        const matchesUser = order.userId?.toLowerCase().includes(q);
        const matchesSku = order.orderLineItems?.some((i: any) => i.skuCode?.toLowerCase().includes(q));
        const matchesBuyerName = buyer ? `${buyer.firstName} ${buyer.lastName}`.toLowerCase().includes(q) : false;
        const matchesBuyerEmail = buyer?.email?.toLowerCase().includes(q);
        return matchesOrder || matchesUser || matchesSku || matchesBuyerName || matchesBuyerEmail;
      }
      return true;
    });
  });

  ngOnInit() {
    // Same guard as the React effect: only an authenticated ADMIN may stay.
    if (!this.auth.isAuthenticated() || this.auth.role() !== 'ADMIN') {
      this.router.navigate(['/']);
      return;
    }
    this.fetchOrders();
  }

  formatPrice(price: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price || 0);
  }

  formatDate(dateString: string) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  statusCfg(status: string) {
    return STATUS_CONFIG[status?.toUpperCase()] || null;
  }

  itemCount(order: any) {
    return order.orderLineItems?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;
  }

  getCountForStatus(status: string) {
    if (status === 'ALL') return this.orders().length;
    return this.orders().filter((o) => o.orderStatus === status).length;
  }

  showNotification(message: string, type = 'error') {
    clearTimeout(this.notifTimer);
    this.notification.set({ show: true, message, type });
    this.notifTimer = setTimeout(() => this.notification.set({ show: false, message: '', type: '' }), 3500);
  }

  async fetchOrders() {
    try {
      const data = await firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/orders/all`));
      // Most recent first
      const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      this.orders.set(sorted);
      this.resolveBuyerInfo(sorted);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 403) {
        this.router.navigate(['/']);
        return;
      }
      this.error.set(err instanceof HttpErrorResponse ? 'Failed to load orders.' : apiErrorMessage(err, 'Failed to load orders.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async resolveBuyerInfo(orderList: any[]) {
    const uniqueIds = [...new Set(orderList.map((o) => o.userId).filter(Boolean))];
    if (uniqueIds.length === 0) return;
    try {
      let params = new HttpParams();
      uniqueIds.forEach((id) => (params = params.append('userIds', id)));
      const users = await firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/users/admin/lookup`, { params }));
      const map: Record<string, any> = {};
      users.forEach((u) => (map[u.id] = u));
      this.buyerInfo.set(map);
    } catch (err) {
      // non-fatal — table just falls back to showing IDs
      console.error('Failed to resolve buyer info', err);
    }
  }

  async handleStatusUpdate(order: any, newStatus: string) {
    this.updatingOrderId.set(order.id);
    try {
      await firstValueFrom(
        this.http.put(`${environment.apiUrl}/orders/${order.id}/status`, null, {
          params: { status: newStatus },
          responseType: 'text',
        }),
      );
      this.showNotification(`Order marked as ${newStatus.toLowerCase()}.`, 'success');
      // Optimistically patch local state instead of a full refetch
      this.orders.update((prev) => prev.map((o) => (o.id === order.id ? { ...o, orderStatus: newStatus } : o)));
    } catch (err) {
      this.showNotification(apiErrorMessage(err, `Failed to mark order as ${newStatus}.`), 'error');
    } finally {
      this.updatingOrderId.set(null);
    }
  }
}
