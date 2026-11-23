import { HttpClient } from '@angular/common/http';
import { Component, Input, OnChanges, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', day: 'numeric' });
};

/**
 * Port of ProductReviews.jsx — usage: <app-product-reviews [skuCode]="product.skuCode" />
 * (React's version only displays reviews; the write-review UI lives in RateReviewDialog,
 * which the Orders page opens.)
 */
@Component({
  selector: 'app-product-reviews',
  imports: [MatCardModule, MatDividerModule, MatIconModule],
  templateUrl: './product-reviews.html',
  styleUrl: './product-reviews.scss',
})
export class ProductReviews implements OnChanges {
  @Input() skuCode = '';

  private http = inject(HttpClient);

  readonly stars = [1, 2, 3, 4, 5];
  reviews = signal<any[]>([]);
  isLoading = signal(true);

  averageRating = computed(() => {
    const r = this.reviews();
    return r.length ? r.reduce((s, x) => s + x.rating, 0) / r.length : 0;
  });

  distribution = computed(() => {
    const r = this.reviews();
    return [5, 4, 3, 2, 1].map((star) => {
      const count = r.filter((x) => x.rating === star).length;
      return { star, count, pct: r.length ? (count / r.length) * 100 : 0 };
    });
  });

  roundedAvg = computed(() => Math.round(this.averageRating()));
  relativeTime = formatRelativeTime;

  ngOnChanges() {
    void this.fetchReviews();
  }

  private async fetchReviews() {
    const sku = this.skuCode;
    try {
      const data = await firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/reviews/product/${sku}`));
      if (sku === this.skuCode) this.reviews.set(data || []);
    } catch (err) {
      console.error('[ProductReviews] Failed to fetch reviews:', err);
    } finally {
      this.isLoading.set(false);
    }
  }
}
