import { AfterViewInit, Component, computed, input, signal } from '@angular/core';

const PALETTE = [
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#0ea5e9', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
];

/** Port of CategoryDonutChart (plain SVG, CSS-animated stroke draw). */
@Component({
  selector: 'app-category-donut-chart',
  templateUrl: './category-donut-chart.html',
  styleUrl: './category-donut-chart.scss',
})
export class CategoryDonutChart implements AfterViewInit {
  data = input.required<{ label: string; value: number }[]>();
  formatPrice = input.required<(n: number) => string>();

  readonly size = 220;
  readonly strokeWidth = 22;
  readonly radius = (this.size - this.strokeWidth) / 2;
  readonly circumference = 2 * Math.PI * this.radius;
  readonly center = this.size / 2;
  readonly rotate = `rotate(-90 ${this.size / 2} ${this.size / 2})`;
  /** Flips to true after first paint so the dashoffset transition animates the draw. */
  drawn = signal(false);

  total = computed(() => this.data().reduce((sum, d) => sum + d.value, 0));

  segments = computed(() => {
    const total = this.total();
    let cumulative = 0;
    return this.data().map((d, i) => {
      const fraction = total > 0 ? d.value / total : 0;
      const length = fraction * this.circumference;
      const dashoffset = -cumulative;
      cumulative += length;
      return {
        ...d,
        length,
        dashoffset,
        color: PALETTE[i % PALETTE.length],
        pct: total > 0 ? Math.round(fraction * 100) : 0,
      };
    });
  });

  ngAfterViewInit() {
    setTimeout(() => this.drawn.set(true), 30);
  }
}
