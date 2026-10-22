import { Component, computed, input } from '@angular/core';
import { classificar } from '../nivel';

/** Selo de status (muito baixo … muito alto): cor sempre com ícone e texto. */
@Component({
  selector: 'app-selo',
  template: `<span class="selo"><i [style.background]="classe().cor"></i>{{ classe().icone }} {{ classe().texto }}</span>`,
  styles: `
    .selo {
      display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600;
      border: 1px solid var(--borda); border-radius: 999px; padding: 2px 10px 2px 8px; margin-top: 6px;
    }
    i { width: 10px; height: 10px; border-radius: 99px; display: inline-block; }
  `,
})
export class Selo {
  /** Percentil (0–100) do nível na história. */
  readonly pct = input.required<number>();
  protected readonly classe = computed(() => classificar(this.pct()));
}
