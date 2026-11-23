import { Component, Input, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Create / edit product overlay. The parent owns all state and requests;
 * `form` is the parent's mutable form object (bound with ngModel here).
 */
@Component({
  selector: 'app-product-form-modal',
  imports: [FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './product-form-modal.html',
  styleUrl: './product-form-modal.scss',
})
export class ProductFormModal {
  mode = input.required<'add' | 'edit'>();
  @Input({ required: true }) form!: { name: string; description: string; price: any; skuCode: string; categoryId: any };
  categories = input<any[]>([]);
  existingImages = input<string[]>([]);
  newImages = input<string[]>([]);
  message = input<{ type: string; text: string }>({ type: '', text: '' });
  submitting = input(false);

  closed = output<void>();
  submitted = output<void>();
  removeExisting = output<number>();
  removeNew = output<number>();
  filesSelected = output<Event>();
}
