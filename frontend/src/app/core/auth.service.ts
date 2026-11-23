import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface AuthUser {
  id: any;
  role: string | undefined;
  email: string | undefined;
}

/**
 * Port of React AuthContext. Exposes signals instead of context values:
 *   auth.isAuthenticated()  auth.user()  auth.isLoading()  auth.role()
 * Token refresh on 401 lives in auth.interceptor.ts.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isAuthenticated = signal(false);
  readonly user = signal<AuthUser | null>(null);
  /** True until the initial localStorage check is done. */
  readonly isLoading = signal(true);
  /** Upper-cased role, '' when logged out. */
  readonly role = computed(() => this.user()?.role?.toUpperCase() ?? '');

  constructor(private router: Router) {
    // Synchronous restore: nothing renders before this runs, so guards never
    // see a stale "logged out" state (the bug the React isLoading flag worked around).
    const token = localStorage.getItem('accessToken');
    if (token) {
      this.isAuthenticated.set(true);
      this.decodeAndSetUser(token);
    }
    this.isLoading.set(false);
  }

  login(accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    this.isAuthenticated.set(true);
    this.decodeAndSetUser(accessToken);
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.isAuthenticated.set(false);
    this.user.set(null);
    const path = window.location.pathname;
    if (path !== '/login' && path !== '/') {
      this.router.navigateByUrl('/login');
    }
  }

  /** Called by the interceptor after a silent token refresh. */
  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    this.decodeAndSetUser(accessToken);
  }

  get accessToken() {
    return localStorage.getItem('accessToken');
  }

  private decodeAndSetUser(token: string) {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const p = JSON.parse(window.atob(base64));
      this.user.set({
        id: p.userId || p.id,
        role: p.role || (p.roles && p.roles[0]),
        email: p.sub || p.email,
      });
    } catch (e) {
      console.error('Failed to parse JWT', e);
      this.user.set(null);
    }
  }
}
