import { Component, Input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProductRatingBadge } from '../product-rating-badge/product-rating-badge';
import { categoryLabel, formatPrice } from './browse-utils';
import { Reveal } from './reveal.directive';

/**
 * Product card shared by Home, Catalog and CategoryView (the three React files had
 * near-identical copies). `view` = 'grid' | 'list'.
 */
@Component({
  selector: 'app-browse-product-card',
  imports: [RouterLink, MatButtonModule, MatIconModule, ProductRatingBadge, Reveal],
  templateUrl: './browse-product-card.html',
  styleUrl: './browse-product-card.scss',
})
export class BrowseProductCard {
  @Input({ required: true }) product: any;
  @Input() view: 'grid' | 'list' = 'grid';
  /** Position in the list, used to stagger the reveal animation. */
  @Input() index = 0;
  /** Max stagger group (React used index % 8 or % 12). */
  @Input() staggerMod = 12;
  @Input() adding = false;
  @Input() saved = false;

  addToCart = output<void>();
  wishlist = output<void>();

  imgFailed = signal(false);
  formatPrice = formatPrice;
  label = () => categoryLabel(this.product);
  showImage = () => !!this.product?.imageUrl && !this.imgFailed();

  onWishlist(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    this.wishlist.emit();
  }

  onAdd(e: Event) {
    e.preventDefault();
    this.addToCart.emit();
  }
}
