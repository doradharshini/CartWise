import { Component, ElementRef, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';

/** Counts up from 0 to `target` once scrolled into view (port of AnimatedCounter). */
@Component({
  selector: 'app-animated-counter',
  template: `{{ display().toLocaleString('en-IN') }}{{ suffix }}`,
})
export class AnimatedCounter implements OnInit, OnDestroy {
  @Input() target = 0;
  @Input() suffix = '';
  display = signal(0);

  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private observer?: IntersectionObserver;
  private raf = 0;

  ngOnInit() {
    if (typeof IntersectionObserver === 'undefined') {
      this.display.set(Math.round(this.target));
      return;
    }
    this.observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        this.start();
        this.observer?.disconnect();
      }
    });
    this.observer.observe(this.el);
  }

  private start() {
    const duration = 1600;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      this.display.set(Math.round(this.target * eased));
      if (p < 1) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    cancelAnimationFrame(this.raf);
  }
}
