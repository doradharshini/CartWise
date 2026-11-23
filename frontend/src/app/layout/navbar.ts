import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../core/auth.service';
import { CartService } from '../core/cart.service';
import { ThemeService } from '../core/theme.service';
import { WishlistService } from '../core/wishlist.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, FormsModule, MatIconModule, MatButtonModule, MatMenuModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  auth = inject(AuthService);
  cart = inject(CartService);
  wishlist = inject(WishlistService);
  theme = inject(ThemeService);
  private router = inject(Router);

  searchQuery = '';
  wishlistCount = computed(() => this.wishlist.wishlistSkus().length);
  /** Bumped whenever the wishlist count changes, so the badge re-runs its pop animation. */
  badgeKey = signal(0);
  private prevCount = 0;

  constructor() {
    effect(() => {
      const c = this.wishlistCount();
      if (c !== this.prevCount) {
        this.badgeKey.update((k) => k + 1);
        this.prevCount = c;
      }
    });
  }

  sellerLink = computed(() =>
    this.auth.isAuthenticated() ? (this.auth.role() === 'BUYER' ? '/become-seller' : '/dashboard') : '/login',
  );

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  search() {
    const q = this.searchQuery.trim();
    if (q) {
      this.router.navigate(['/search'], { queryParams: { q: this.searchQuery } });
      this.searchQuery = '';
    }
  }
}
