import { HttpClient } from '@angular/common/http';
import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Port of ProductRatingBadge.jsx. Usage:
 *   <app-product-rating-badge [skuCode]="product.skuCode" />
 *   <app-product-rating-badge [skuCode]="product.skuCode" [size]="18" />
 * Renders nothing while loading or when there are no reviews.
 */
@Component({
  selector: 'app-product-rating-badge',
  imports: [MatIconModule],
  template: `
    @if (summary(); as s) {
      <div class="rating">
        <div class="rating__stars">
          @for (n of stars; track n) {
            <mat-icon
              class="rating__star"
              [class.rating__star--on]="n <= rounded()"
              [style.font-size.px]="size"
              [style.width.px]="size"
              [style.height.px]="size"
              >star</mat-icon
            >
          }
        </div>
        <span class="rating__count">({{ s.count }})</span>
      </div>
    }
  `,
  styles: `
    .rating {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .rating__stars {
      display: flex;
      align-items: center;
      gap: 0.125rem;
    }

    .rating__star {
      color: var(--neutral-200);
    }

    .rating__star--on {
      color: var(--amber-400);
    }

    .rating__count {
      font-size: 0.75rem;
      line-height: 1rem;
      font-weight: 500;
      color: var(--neutral-500);
    }
  `,
})
export class ProductRatingBadge implements OnChanges {
  @Input() skuCode?: string;
  /** Star size in px. */
  @Input() size = 14;

  private http = inject(HttpClient);
  stars = [1, 2, 3, 4, 5];
  summary = signal<{ average: number; count: number } | null>(null);
  rounded = () => Math.round(this.summary()?.average ?? 0);

  async ngOnChanges() {
    const sku = this.skuCode;
    if (!sku) {
      this.summary.set(null);
      return;
    }
    try {
      const reviews = (await firstValueFrom(
        this.http.get<any[]>(`${environment.apiUrl}/reviews/product/${sku}`),
      )) || [];
      if (sku !== this.skuCode) return; // input changed while in flight
      this.summary.set(
        reviews.length
          ? { average: reviews.reduce((s, r) => s + r.rating, 0) / reviews.length, count: reviews.length }
          : null,
      );
    } catch {
      this.summary.set(null);
    }
  }
}
