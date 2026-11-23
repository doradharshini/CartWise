import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  template: `
    <footer class="footer">
      <p class="footer__text">&copy; {{ year }} Cartwise. Built with Angular &amp; Spring Boot.</p>
    </footer>
  `,
  styles: `
    .footer {
      border-top: 1px solid var(--border);
      height: 4rem;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .footer__text {
      font-size: 0.875rem;
      line-height: 1.25rem;
      color: var(--muted-foreground);
    }
  `,
})
export class Footer {
  year = new Date().getFullYear();
}
