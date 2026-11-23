import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** "Delete product" confirmation overlay. */
@Component({
  selector: 'app-delete-confirm-modal',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './delete-confirm-modal.html',
  styleUrl: './delete-confirm-modal.scss',
})
export class DeleteConfirmModal {
  target = input.required<any>();
  busy = input(false);
  cancelled = output<void>();
  confirmed = output<void>();
}
