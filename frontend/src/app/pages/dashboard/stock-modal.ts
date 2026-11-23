import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** "Manage stock" overlay. The parent performs the request; this owns the quantity field. */
@Component({
  selector: 'app-stock-modal',
  imports: [FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './stock-modal.html',
  styleUrl: './stock-modal.scss',
})
export class StockModal {
  product = input.required<any>();
  currentStock = input<any>(null);
  isChecking = input(false);
  submitting = input(false);
  message = input<{ type: string; text: string }>({ type: '', text: '' });
  closed = output<void>();
  addStock = output<number>();

  quantityToAdd: any = '';

  reset() {
    this.quantityToAdd = '';
  }

  submit() {
    if (!this.quantityToAdd || this.quantityToAdd < 1) return;
    this.addStock.emit(Number.parseInt(this.quantityToAdd, 10));
  }
}
