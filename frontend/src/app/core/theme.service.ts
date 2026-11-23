import { Injectable, effect, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<'light' | 'dark'>(this.initial());

  constructor() {
    effect(() => {
      const t = this.theme();
      document.documentElement.classList.toggle('dark', t === 'dark');
      try {
        localStorage.setItem('cartwise-theme', t);
      } catch {}
    });
  }

  toggle() {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  private initial(): 'light' | 'dark' {
    try {
      const stored = localStorage.getItem('cartwise-theme');
      if (stored === 'dark' || stored === 'light') return stored;
    } catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
