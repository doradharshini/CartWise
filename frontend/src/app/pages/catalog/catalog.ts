import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { WishlistService } from '../../core/wishlist.service';
import { BrowseProductCard } from '../../shared/browse/browse-product-card';
import {
  Notification,
  QuickAddService,
  categoryName,
  sortLabel,
  sortProducts,
} from '../../shared/browse/browse-utils';
import { Reveal } from '../../shared/browse/reveal.directive';
import { SortMenu } from '../../shared/browse/sort-menu';
import { ToastBanner } from '../../shared/browse/toast-banner';

@Component({
  selector: 'app-page-catalog',
  imports: [FormsModule, MatButtonModule, MatIconModule, BrowseProductCard, Reveal, SortMenu, ToastBanner],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
})
export class CatalogPage implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private quickAdd = inject(QuickAddService);
  auth = inject(AuthService);
  wishlist = inject(WishlistService);

  products = signal<any[]>([]);
  isLoading = signal(true);
  error = signal('');
  addingSku = signal<string | null>(null);

  search = signal('');
  sort = signal('default');
  view = signal<'grid' | 'list'>('grid');
  activeCategory = signal('All');
  notification = signal<Notification>({ show: false, message: '', type: '' });
  private toastTimer: any;

  sortLabel = sortLabel;
  skeletons = [1, 2, 3, 4, 5, 6, 7, 8];

  categories = computed(() => [
    'All',
    ...Array.from(new Set(this.products().map(categoryName).filter(Boolean) as string[])),
  ]);

  filtered = computed(() => {
    const cat = this.activeCategory();
    const q = this.search().toLowerCase();
    const list = this.products().filter(
      (p) => (cat === 'All' || categoryName(p) === cat) && p.name.toLowerCase().includes(q),
    );
    return sortProducts(list, this.sort());
  });

  hasFilters = computed(() => !!this.search() || this.activeCategory() !== 'All' || this.sort() !== 'default');

  async ngOnInit() {
    try {
      const data: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/products`));
      this.products.set(data?.content || data || []);
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Failed to fetch products from the server.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  showNotification(message: string, type = 'error') {
    this.notification.set({ show: true, message, type });
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.notification.set({ show: false, message: '', type: '' }), 3000);
  }

  async handleAddToCart(skuCode: string) {
    if (!this.auth.isAuthenticated() && !localStorage.getItem('accessToken')) {
      this.router.navigate(['/login']);
      return;
    }
    this.addingSku.set(skuCode);
    try {
      await this.quickAdd.add(skuCode);
      this.showNotification('Added to your cart!', 'success');
    } catch (err: any) {
      this.showNotification(err.message, 'error');
    } finally {
      this.addingSku.set(null);
    }
  }

  handleWishlist(skuCode: string) {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.wishlist.toggle(skuCode);
  }

  clearAll() {
    this.search.set('');
    this.activeCategory.set('All');
    this.sort.set('default');
  }

  reload() {
    window.location.reload();
  }
}
