import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Notification } from './browse-utils';

/** Bottom-right toast used by Home / Catalog / CategoryView. */
@Component({
  selector: 'app-toast-banner',
  imports: [MatIconModule],
  styles: `
    @keyframes toast-in {
      from { opacity: 0; transform: translateY(1.25rem) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .toast {
      position: fixed;
      right: 1.5rem;
      bottom: 1.5rem;
      z-index: 100;
      animation: toast-in 0.25s ease-out;
    }

    .toast__inner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1.25rem;
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl);
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-weight: 600;
      color: #fff;
    }

    .toast__inner--error {
      background: var(--red-600);
    }

    .toast__inner--success {
      background: var(--neutral-900);
    }

    :host-context(.dark) .toast__inner--success {
      background: var(--neutral-700);
    }

    @media (prefers-reduced-motion: reduce) {
      .toast { animation: none; }
    }
  `,
  template: `
    @if (notification?.show) {
      <div class="toast">
        <div
          class="toast__inner"
          [class.toast__inner--error]="notification!.type === 'error'"
          [class.toast__inner--success]="notification!.type !== 'error'"
        >
          <mat-icon>{{ notification!.type === 'error' ? 'error_outline' : 'check_circle_outline' }}</mat-icon>
          {{ notification!.message }}
        </div>
      </div>
    }
  `,
})
export class ToastBanner {
  @Input() notification: Notification | null = null;
}
