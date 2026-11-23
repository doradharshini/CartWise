import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Port of the CouponPreview function component from AdminCouponManagement.jsx. */
@Component({
  selector: 'app-coupon-preview',
  imports: [MatIconModule],
  templateUrl: './coupon-preview.html',
  styleUrl: './coupon-preview.scss',
})
export class CouponPreview {
  @Input() code = '';
  @Input() discountType = 'PERCENTAGE';
  @Input() discountValue: any = '';
  @Input() expirationDate = '';
  @Input() usageLimit: any = '';

  displayCode = () => (this.code.trim().length > 0 ? this.code.toUpperCase() : 'YOURCOUPON');
  displayValue = () =>
    this.discountValue
      ? this.discountType === 'PERCENTAGE'
        ? `${this.discountValue}% OFF`
        : `₹${this.discountValue} OFF`
      : '— OFF';
  displayDate = () =>
    this.expirationDate
      ? new Date(this.expirationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'No expiry set';
  displayLimit = () => (this.usageLimit ? `${this.usageLimit} uses` : 'Unlimited');
}

