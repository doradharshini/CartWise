import { Component, input, model, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { SORT_OPTIONS, sortLabel } from './browse-utils';

/** Sort dropdown (Material menu). Usage: <app-sort-menu [(value)]="sort" /> */
@Component({
  selector: 'app-sort-menu',
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  styleUrl: './sort-menu.scss',
  template: `
    <button
      mat-stroked-button
      class="sort-menu__button"
      [class.sort-menu__button--bold]="bold()"
      [matMenuTriggerFor]="menu"
      (menuOpened)="open.set(true)"
      (menuClosed)="open.set(false)"
    >
      <mat-icon class="sort-menu__icon">swap_vert</mat-icon>
      {{ label() }}
      <mat-icon class="sort-menu__chevron" [class.sort-menu__chevron--open]="open()">expand_more</mat-icon>
    </button>
    <mat-menu #menu="matMenu" xPosition="before">
      @for (opt of options; track opt.value) {
        <button mat-menu-item class="sort-menu__option" (click)="value.set(opt.value)">
          <span class="sort-menu__option-label" [class.sort-menu__option-label--active]="value() === opt.value">{{ opt.label }}</span>
          @if (value() === opt.value) {
            <mat-icon iconPositionEnd class="sort-menu__check">check</mat-icon>
          }
        </button>
      }
    </mat-menu>
  `,
})
export class SortMenu {
  value = model('default');
  bold = input(false);
  open = signal(false);
  options = SORT_OPTIONS;
  label = () => sortLabel(this.value()) || 'Sort';
}
