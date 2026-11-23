import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RateReviewDialogData {
  /** skuCode (NOT the product's database id) — review-service verifies the purchase by SKU. */
  skuCode: string;
  productName?: string;
}

/**
 * Port of RateReviewModal.jsx. Open with:
 *   this.dialog.open(RateReviewDialog, { data: { skuCode, productName }, maxWidth: '28rem', width: '100%' })
 *     .afterClosed().subscribe((submitted) => { if (submitted) reload(); });
 * Closes with `true` after a successful submit (React's onSubmitted), otherwise undefined (onClose).
 */
@Component({
  selector: 'app-rate-review-dialog',
  imports: [FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './rate-review-dialog.html',
  styleUrl: './rate-review-dialog.scss',
})
export class RateReviewDialog {
  private http = inject(HttpClient);
  private ref = inject(MatDialogRef<RateReviewDialog, boolean>);
  data = inject<RateReviewDialogData>(MAT_DIALOG_DATA);

  readonly stars = [1, 2, 3, 4, 5];
  readonly labels = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

  rating = signal(0);
  hovered = signal(0);
  comment = '';
  isSubmitting = signal(false);
  banner = signal<{ show: boolean; message: string; type: string }>({ show: false, message: '', type: '' });

  display = () => this.hovered() || this.rating();

  private showBanner(message: string, type = 'error') {
    this.banner.set({ show: true, message, type });
    setTimeout(() => this.banner.set({ show: false, message: '', type: '' }), 4000);
  }

  close() {
    this.ref.close();
  }

  async submit() {
    if (this.rating() === 0) {
      this.showBanner('Please select a star rating.', 'error');
      return;
    }
    this.isSubmitting.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/reviews`, {
          productId: this.data.skuCode, // backend field name is productId, but expects skuCode
          rating: this.rating(),
          comment: this.comment.trim() || null,
        }),
      );
      this.showBanner('Your review has been published!', 'success');
      setTimeout(() => this.ref.close(true), 900);
    } catch (err) {
      // Show our own copy by status code (the server's 403 text is generic).
      const status = err instanceof HttpErrorResponse ? err.status : 0;
      if (status === 403) this.showBanner("You can only review products you've purchased.", 'error');
      else if (status === 409) this.showBanner("You've already reviewed this product.", 'error');
      else if (status === 503) this.showBanner('Verification is temporarily unavailable. Please try again shortly.', 'error');
      else if (status === 0) this.showBanner('Network error. Please try again.', 'error');
      else this.showBanner((err as HttpErrorResponse).error?.message || 'Failed to submit review.', 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
