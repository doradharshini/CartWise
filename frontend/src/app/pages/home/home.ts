import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { WishlistService } from '../../core/wishlist.service';
import { AnimatedCounter } from '../../shared/browse/animated-counter';
import { BrowseProductCard } from '../../shared/browse/browse-product-card';
import { Notification, QuickAddService, sortProducts } from '../../shared/browse/browse-utils';
import { Reveal } from '../../shared/browse/reveal.directive';
import { SortMenu } from '../../shared/browse/sort-menu';
import { ToastBanner } from '../../shared/browse/toast-banner';

const TICKER_ITEMS = [
  'Free Shipping on orders ₹999+',
  '10,000+ Products',
  'Secure Checkout',
  'Easy 7-Day Returns',
  '500+ Verified Sellers',
  '24/7 Customer Support',
  '100% Authentic Products',
  'Cash on Delivery Available',
];

const CATEGORY_VISUALS = [
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&q=80', // Mobile
  'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&q=80', // Laptop
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=80', // Headphones
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=80', // Watch
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=80', // Sports
  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=900&q=80', // Fashion
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=900&q=80', // Camera
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&q=80', // Home
];

const tint = (from: string, fromPct: number, to: string, toPct: number) =>
  `linear-gradient(to top right, color-mix(in oklab, var(--${from}) ${fromPct}%, transparent), color-mix(in oklab, var(--${to}) ${toPct}%, transparent))`;

const CATEGORY_GRADIENTS = [
  tint('blue-600', 80, 'cyan-500', 70),
  tint('violet-600', 80, 'fuchsia-500', 70),
  tint('emerald-600', 80, 'teal-500', 70),
  tint('amber-500', 85, 'orange-500', 75),
  tint('rose-600', 80, 'pink-500', 70),
  tint('neutral-900', 85, 'neutral-700', 70),
];

@Component({
  selector: 'app-page-home',
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    AnimatedCounter,
    BrowseProductCard,
    Reveal,
    SortMenu,
    ToastBanner,
  ],
  templateUrl: './home.html',
  // Styles are split across files to stay under the per-component stylesheet budget.
  styleUrls: [
    './home.scss',
    './home-deals.scss',
    './home-categories.scss',
    './home-sections.scss',
    './home-more.scss',
  ],
})
export class HomePage implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  private quickAdd = inject(QuickAddService);
  auth = inject(AuthService);
  wishlist = inject(WishlistService);

  products = signal<any[]>([]);
  categories = signal<any[]>([]);
  isLoading = signal(true);
  error = signal('');
  addingSku = signal<string | null>(null);
  email = '';
  notification = signal<Notification>({ show: false, message: '', type: '' });
  private toastTimer: any;

  sort = signal('default');
  filterOpen = signal(false);

  /** Sale countdown (8h from page load), ticks every second. */
  private endTime = Date.now() + 8 * 60 * 60 * 1000;
  countdown = signal({ h: 0, m: 0, s: 0 });
  private countdownId: any;

  tickerItems = [...TICKER_ITEMS, ...TICKER_ITEMS];
  skeletons = [1, 2, 3, 4];
  pad = (n: number) => String(n).padStart(2, '0');

  stats = [
    { icon: 'inventory_2', label: 'Products Listed', value: 10000, suffix: '+' },
    { icon: 'group', label: 'Active Sellers', value: 500, suffix: '+' },
    { icon: 'sell', label: 'Categories', value: 50, suffix: '+' },
    { icon: 'star', label: 'Avg. Rating', value: 4.8, suffix: '★' },
  ];

  perks = [
    { icon: 'grid_view', title: 'Curated Collections', desc: 'Handpicked selections of the latest trends, tailored to your personal style and needs.' },
    { icon: 'travel_explore', title: 'Seamless Discovery', desc: 'Easily navigate through our extensive catalog of premium products to find your perfect match.' },
    { icon: 'auto_awesome', title: 'Premium Quality', desc: 'We ensure every product on our platform meets strict standards for quality and authenticity.' },
  ];

  services = [
    { icon: 'local_shipping', title: 'Fast delivery', desc: 'Reliable logistics for everyday orders.' },
    { icon: 'verified_user', title: 'Safer payments', desc: 'Protected checkout from cart to confirmation.' },
    { icon: 'replay', title: 'Easy returns', desc: 'Simple policies that reduce buying hesitation.' },
  ];

  trust = [
    { icon: 'local_shipping', title: 'Free Shipping', desc: 'On all orders above ₹999. No hidden charges.' },
    { icon: 'verified_user', title: 'Secure Checkout', desc: '256-bit SSL encryption on every transaction.' },
    { icon: 'replay', title: '7-Day Returns', desc: 'Not satisfied? Return with zero questions asked.' },
    { icon: 'trending_up', title: 'Best Prices', desc: 'Price-matched deals from 500+ verified sellers.' },
  ];

  emojis = ['📱', '💻', '🎧', '⌚', '👟', '📸'];

  /** Sort the full list, then show the top 7. */
  displayedProducts = computed(() => sortProducts(this.products(), this.sort()).slice(0, 7));
  topCategories = computed(() => this.categories().slice(0, 6));
  showSellerCard = computed(() => !this.auth.isAuthenticated() || this.auth.role() === 'BUYER');

  ngOnInit() {
    this.tick();
    this.countdownId = setInterval(() => this.tick(), 1000);
    this.fetchHomeData();
  }

  ngOnDestroy() {
    clearInterval(this.countdownId);
    clearTimeout(this.toastTimer);
  }

  private tick() {
    const diff = Math.max(0, this.endTime - Date.now());
    this.countdown.set({
      h: Math.floor(diff / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    });
  }

  private async fetchHomeData() {
    try {
      const prodData: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/products`));
      this.products.set(prodData?.content || prodData || []);
      try {
        this.categories.set(await firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/products/categories`)));
      } catch {
        // categories are optional (React only used them when the response was ok)
      }
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Failed to fetch products from the server.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  getCategoryIcon(name?: string): string {
    if (!name) return 'inventory_2';
    const n = name.toLowerCase();
    if (n.includes('laptops') || n.includes('computer')) return 'desktop_windows';
    if (n.includes('phone') || n.includes('mobile')) return 'smartphone';
    if (n.includes('audio') || n.includes('headphone')) return 'headphones';
    if (n.includes('watch') || n.includes('wearable')) return 'watch';
    if (n.includes('shoe') || n.includes('sport')) return 'directions_walk';
    if (n.includes('fashion') || n.includes('cloth')) return 'checkroom';
    if (n.includes('glass') || n.includes('eye')) return 'visibility';
    if (n.includes('camera') || n.includes('photo')) return 'photo_camera';
    if (n.includes('home') || n.includes('furniture')) return 'light';
    if (n.includes('electronics') || n.includes('device')) return 'storefront';
    return 'inventory_2';
  }

  getCategoryImage(name: string | undefined, index: number): string {
    const n = (name || '').toLowerCase();
    if (n.includes('phone') || n.includes('mobile')) return CATEGORY_VISUALS[0];
    if (n.includes('laptop') || n.includes('computer')) return CATEGORY_VISUALS[1];
    if (n.includes('audio') || n.includes('headphone')) return CATEGORY_VISUALS[2];
    if (n.includes('watch') || n.includes('wearable')) return CATEGORY_VISUALS[3];
    if (n.includes('sport')) return CATEGORY_VISUALS[4];
    if (n.includes('fashion') || n.includes('cloth')) return CATEGORY_VISUALS[5];
    if (n.includes('camera') || n.includes('photo')) return CATEGORY_VISUALS[6];
    if (n.includes('home') || n.includes('furniture')) return CATEGORY_VISUALS[7];
    return CATEGORY_VISUALS[index % CATEGORY_VISUALS.length];
  }

  getCategoryGradient(index: number): string {
    return CATEGORY_GRADIENTS[index % CATEGORY_GRADIENTS.length];
  }

  openCategory(cat: any) {
    this.router.navigate(['/category', cat.id], { queryParams: { name: cat.name } });
  }

  go(path: string) {
    this.router.navigate([path]);
  }

  scrollToCategories() {
    document.getElementById('category-showcase')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
}
