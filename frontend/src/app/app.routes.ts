import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { RootLayout } from './layout/root-layout';

/**
 * Port of App.jsx. Pages are lazy-loaded.
 * Like the React app, most pages are NOT route-guarded (each page redirects itself
 * when it needs a user); only the /admin/* pages are role-guarded.
 */
export const routes: Routes = [
  // Standalone (no navbar/footer)
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./pages/register/register').then((m) => m.RegisterPage) },

  // With navbar/footer
  {
    path: '',
    component: RootLayout,
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./pages/home/home').then((m) => m.HomePage) },
      { path: 'catalog', loadComponent: () => import('./pages/catalog/catalog').then((m) => m.CatalogPage) },
      { path: 'product/:id', loadComponent: () => import('./pages/product-details/product-details').then((m) => m.ProductDetailsPage) },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile').then((m) => m.ProfilePage) },
      { path: 'category/:categoryId', loadComponent: () => import('./pages/category-view/category-view').then((m) => m.CategoryViewPage) },
      { path: 'search', loadComponent: () => import('./pages/search-results/search-results').then((m) => m.SearchResultsPage) },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage) },
      { path: 'become-seller', loadComponent: () => import('./pages/become-seller/become-seller').then((m) => m.BecomeSellerPage) },
      { path: 'cart', loadComponent: () => import('./pages/cart/cart').then((m) => m.CartPage) },
      { path: 'addresses', loadComponent: () => import('./pages/addresses/addresses').then((m) => m.AddressesPage) },
      { path: 'checkout', loadComponent: () => import('./pages/checkout/checkout').then((m) => m.CheckoutPage) },
      { path: 'orders', loadComponent: () => import('./pages/orders/orders').then((m) => m.OrdersPage) },
      { path: 'order-lifecycle/:id', loadComponent: () => import('./pages/order-lifecycle/order-lifecycle').then((m) => m.OrderLifecyclePage) },
      { path: 'wishlist', loadComponent: () => import('./pages/wishlist/wishlist').then((m) => m.WishlistPage) },
    ],
  },

  // Admin (role-guarded, no navbar/footer — same as the React app)
  {
    path: 'admin/coupons',
    canActivate: [authGuard('ADMIN')],
    loadComponent: () => import('./pages/admin-coupon-management/admin-coupon-management').then((m) => m.AdminCouponManagementPage),
  },
  {
    path: 'admin/orders',
    canActivate: [authGuard('ADMIN')],
    loadComponent: () => import('./pages/admin-orders/admin-orders').then((m) => m.AdminOrdersPage),
  },

  { path: '**', redirectTo: '' },
];
