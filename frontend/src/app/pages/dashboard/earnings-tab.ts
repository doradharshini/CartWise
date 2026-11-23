import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CategoryDonutChart } from './category-donut-chart';
import { StatCard } from './stat-card';

export interface EarningsState {
  isLoading: boolean;
  error: string;
  skuSummaries: any[];
  totalRevenue: number;
  totalUnits: number;
  categoryBreakdown: { label: string; value: number }[];
  topProducts: any[];
}

/** Earnings tab body (stat cards, revenue donut, top products). Purely presentational. */
@Component({
  selector: 'app-earnings-tab',
  imports: [MatIconModule, CategoryDonutChart, StatCard],
  templateUrl: './earnings-tab.html',
  styleUrl: './earnings-tab.scss',
})
export class EarningsTab {
  state = input.required<EarningsState>();
  productCount = input.required<number>();
  formatPrice = input.required<(n: number) => string>();
}
