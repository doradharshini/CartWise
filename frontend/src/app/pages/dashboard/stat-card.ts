import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Port of StatCard. `icon` is a Material Icons name. */
@Component({
  selector: 'app-stat-card',
  imports: [MatIconModule],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss',
})
export class StatCard {
  icon = input.required<string>();
  label = input.required<string>();
  value = input.required<string | number>();
}
