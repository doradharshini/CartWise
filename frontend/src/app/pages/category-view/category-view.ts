import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subscription, combineLatest, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { WishlistService } from '../../core/wishlist.service';
import { BrowseProductCard } from '../../shared/browse/browse-product-card';
import { Notification, QuickAddService, sortProducts } from '../../shared/browse/browse-utils';
import { Reveal } from '../../shared/browse/reveal.directive';
import { SortMenu } from '../../shared/browse/sort-menu';
import { ToastBanner } from '../../shared/browse/toast-banner';

@Component({
  selector: 'app-page-category-view',
  imports: [MatButtonModule, MatIconModule, BrowseProductCard, Reveal, SortMenu, ToastBanner],
  templateUrl: './category-view.html',
  styleUrl: './category-view.scss',
})
export class CategoryViewPage implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private quickAdd = inject(QuickAddService);
  auth = inject(AuthService);
  wishlist = inject(WishlistService);

  categoryId = signal('');
  categoryName = signal('Category');

  products = signal<any[]>([]);
  isLoading = signal(true);
  error = signal('');
  addingSku = signal<string | null>(null);

  sort = signal('default');
  view = signal<'grid' | 'list'>('grid');
  notification = signal<Notification>({ show: false, message: '', type: '' });
  private toastTimer: any;

  currentPage = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);
  readonly pageSize = 12;

  skeletons = [1, 2, 3, 4, 5, 6, 7, 8];
  sortedProducts = computed(() => sortProducts(this.products(), this.sort()));

  /** Page numbers with "..." gaps — port of getPages() in the React Pagination. */
  pages = computed<(number | '...')[]>(() => {
    const total = this.totalPages();
    const cur = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);
    const pages: (number | '...')[] = [];
    const left = Math.max(1, cur - 1);
    const right = Math.min(total - 2, cur + 1);
    pages.push(0);
    if (left > 1) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < total - 2) pages.push('...');
    pages.push(total - 1);
    return pages;
  });

  private sub?: Subscription;

  ngOnInit() {
    // Re-runs when :categoryId or ?name changes while this component stays mounted.
    this.sub = combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([params, query]) => {
      this.categoryName.set(query.get('name') || 'Category');
      const id = params.get('categoryId') || '';
      if (id !== this.categoryId()) {
        this.categoryId.set(id);
        this.currentPage.set(0);
        this.products.set([]);
        this.fetch();
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    clearTimeout(this.toastTimer);
  }

  async fetch() {
    this.isLoading.set(true);
    this.error.set('');
    const id = this.categoryId();
    const page = this.currentPage();
    try {
      const data: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/products/category/${id}?page=${page}&size=${this.pageSize}`),
      );
      if (id !== this.categoryId() || page !== this.currentPage()) return; // superseded
      this.products.set(data.content || []);
      this.totalPages.set(data.totalPages || 0);
      this.totalElements.set(data.totalElements || 0);
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Failed to fetch category products.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  handlePageChange(page: number) {
    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.fetch();
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

  goHome() {
    this.router.navigate(['/']);
  }

  reload() {
    window.location.reload();
  }
}
