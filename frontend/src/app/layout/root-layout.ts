import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from './footer';
import { Navbar } from './navbar';

@Component({
  selector: 'app-root-layout',
  imports: [RouterOutlet, Navbar, Footer],
  template: `
    <div class="shell">
      <app-navbar />
      <main class="shell__main">
        <router-outlet />
      </main>
      <app-footer />
    </div>
  `,
  styles: `
    .shell {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .shell__main {
      flex: 1;
      background: var(--surface-page);
    }
  `,
})
export class RootLayout {}
