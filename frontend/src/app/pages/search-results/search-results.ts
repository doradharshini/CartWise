import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subscription, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { WishlistService } from '../../core/wishlist.service';
import { ProductRatingBadge } from '../../shared/product-rating-badge/product-rating-badge';
import { QuickAddService, formatPrice } from '../../shared/browse/browse-utils';
import { Reveal } from '../../shared/browse/reveal.directive';

@Component({
  selector: 'app-page-search-results',
  imports: [RouterLink, MatButtonModule, MatIconModule, ProductRatingBadge, Reveal],
  templateUrl: './search-results.html',
  styleUrl: './search-results.scss',
})
export class SearchResultsPage implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private quickAdd = inject(QuickAddService);
  auth = inject(AuthService);
  wishlist = inject(WishlistService);

  query = signal('');
  products = signal<any[]>([]);
  isLoading = signal(true);
  error = signal('');
  wishBusy = signal<string | null>(null);
  failedImages = signal<Set<any>>(new Set());

  currentPage = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);
  readonly pageSize = 12;

  formatPrice = formatPrice;
  skeletons = [1, 2, 3, 4];

  private sub?: Subscription;
  private busyTimer: any;

  ngOnInit() {
    this.sub = this.route.queryParamMap.subscribe((q) => {
      this.query.set(q.get('q') || '');
      this.currentPage.set(0);
      this.fetch();
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    clearTimeout(this.busyTimer);
  }

  async fetch() {
    const query = this.query();
    const page = this.currentPage();
    if (!query) {
      this.products.set([]);
      this.isLoading.set(false);
      return;
    }
    this.isLoading.set(true);
    this.error.set('');
    try {
      const data: any = await firstValueFrom(
        this.http.get(
          `${environment.apiUrl}/products/search?keyword=${encodeURIComponent(query)}&page=${page}&size=${this.pageSize}`,
        ),
      );
      if (query !== this.query() || page !== this.currentPage()) return; // superseded
      this.products.set(data.content || []);
      this.totalPages.set(data.totalPages || 0);
      this.totalElements.set(data.totalElements || 0);
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Failed to fetch search results.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.fetch();
  }

  async handleAddToCart(skuCode: string) {
    if (!this.auth.isAuthenticated() || !localStorage.getItem('accessToken')) {
      this.router.navigate(['/login']);
      return;
    }
    try {
      await this.quickAdd.add(skuCode, {
        outOfStock: 'Sorry, this item is out of stock!',
        failed: 'Failed to update cart.',
        quantityFallback: false,
      });
    } catch (err: any) {
      this.error.set(err.message);
    }
  }

  handleWishlist(skuCode: string) {
    this.wishBusy.set(skuCode);
    try {
      this.wishlist.toggle(skuCode);
    } finally {
      clearTimeout(this.busyTimer);
      this.busyTimer = setTimeout(() => this.wishBusy.set(null), 250);
    }
  }

  markImageFailed(id: any) {
    this.failedImages.update((s) => new Set(s).add(id));
  }

  goHome() {
    this.router.navigate(['/']);
  }

  reload() {
    window.location.reload();
  }
}
