import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren, inject, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Backend error responses are usually JSON ({"message": ...}) but sometimes plain text.
 * Requests here use responseType 'text', so err.error is the raw body: try JSON first,
 * pull out .message, and only show the raw body if it genuinely isn't JSON.
 */
export function extractErrorMessage(err: any, fallback: string): string {
  const raw = err?.error;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed.message || parsed.error || fallback;
    } catch {
      return raw || fallback;
    }
  }
  if (raw && typeof raw === 'object') return raw.message || raw.error || fallback;
  return fallback;
}

/** Port of VerifyEmailModal: request code -> 6-digit input -> confirm. */
@Component({
  selector: 'app-verify-email-modal',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './verify-email-modal.html',
  styleUrl: './verify-email-modal.scss',
})
export class VerifyEmailModal implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  readonly closed = output<void>();
  readonly verified = output<void>();

  @ViewChildren('digitInput') inputs!: QueryList<ElementRef<HTMLInputElement>>;

  otp = signal<string[]>(['', '', '', '', '', '']);
  isRequesting = signal(true);
  isConfirming = signal(false);
  error = signal('');
  resendCooldown = signal(0);
  private cooldownTimer: any;

  ngOnInit() {
    void this.requestCode();
  }

  ngOnDestroy() {
    clearInterval(this.cooldownTimer);
  }

  private focusInput(index: number) {
    this.inputs?.get(index)?.nativeElement.focus();
  }

  private startCooldown(seconds: number) {
    clearInterval(this.cooldownTimer);
    this.resendCooldown.set(seconds);
    this.cooldownTimer = setInterval(() => {
      this.resendCooldown.update((c) => c - 1);
      if (this.resendCooldown() <= 0) clearInterval(this.cooldownTimer);
    }, 1000);
  }

  async requestCode() {
    this.isRequesting.set(true);
    this.error.set('');
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/users/verify-email/request`, null, { responseType: 'text' }),
      );
      this.startCooldown(30);
    } catch (err) {
      this.error.set(extractErrorMessage(err, 'Failed to send verification code.'));
    } finally {
      this.isRequesting.set(false);
    }
  }

  handleDigitChange(index: number, input: HTMLInputElement) {
    const value = input.value;
    if (!/^\d?$/.test(value)) {
      input.value = this.otp()[index]; // digits only, one char
      return;
    }
    this.otp.update((o) => o.map((d, i) => (i === index ? value : d)));
    if (value && index < 5) this.focusInput(index + 1);
  }

  handleKeyDown(index: number, e: KeyboardEvent) {
    if (e.key === 'Backspace' && !this.otp()[index] && index > 0) {
      this.focusInput(index - 1);
    }
  }

  handlePaste(e: ClipboardEvent) {
    const pasted = (e.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.split('');
    while (next.length < 6) next.push('');
    this.otp.set(next);
    this.focusInput(Math.min(pasted.length, 5));
  }

  async handleConfirm() {
    const code = this.otp().join('');
    if (code.length !== 6) {
      this.error.set('Enter all 6 digits.');
      return;
    }
    this.isConfirming.set(true);
    this.error.set('');
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/users/verify-email/confirm`, { otp: code }, { responseType: 'text' }),
      );
      this.verified.emit();
    } catch (err) {
      this.error.set(extractErrorMessage(err, 'Invalid or expired code.'));
    } finally {
      this.isConfirming.set(false);
    }
  }
}
