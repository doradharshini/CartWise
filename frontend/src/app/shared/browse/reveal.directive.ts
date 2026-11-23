import { Directive, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Replacement for framer-motion's `initial="hidden" whileInView="visible"` fade-up.
 * <div appReveal [revealDelay]="i * 60" [revealY]="24"> ... </div>
 * Starts hidden/offset, animates in once when scrolled into view (also on first paint if visible).
 */
@Directive({ selector: '[appReveal]' })
export class Reveal implements OnInit, OnDestroy {
  @Input() revealDelay = 0;
  @Input() revealY = 24;
  @Input() revealScale = 1;
  @Input() revealDuration = 450;

  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private observer?: IntersectionObserver;
  private timer?: any;

  ngOnInit() {
    const s = this.el.style;
    s.opacity = '0';
    s.transform = `translateY(${this.revealY}px) scale(${this.revealScale})`;
    s.transition = `opacity ${this.revealDuration}ms cubic-bezier(0.22,1,0.36,1) ${this.revealDelay}ms, transform ${this.revealDuration}ms cubic-bezier(0.22,1,0.36,1) ${this.revealDelay}ms`;

    if (typeof IntersectionObserver === 'undefined') {
      this.show();
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.show();
          this.observer?.disconnect();
        }
      },
      { rootMargin: '0px 0px -40px 0px' },
    );
    this.observer.observe(this.el);
  }

  private show() {
    const s = this.el.style;
    s.opacity = '1';
    s.transform = 'none';
    // Hand `transition` back to the element's own classes (hover effects etc.) once done.
    this.timer = setTimeout(() => {
      s.transition = '';
      s.transform = '';
    }, this.revealDelay + this.revealDuration + 50);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    clearTimeout(this.timer);
  }
}
