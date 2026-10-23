import { Component, computed, input } from '@angular/core';
import { classificar } from '../nivel';

/** Selo de status (muito baixo … muito alto): cor sempre com ícone e texto. */
@Component({
  selector: 'app-selo',
  template: `<span class="selo" [style.--cor]="classe().cor"><i></i>{{ classe().icone }} {{ classe().texto }}</span>`,
  styles: `
    :host { display: inline-block; }
    .selo {
      display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; white-space: nowrap;
      color: var(--selo-texto, color-mix(in srgb, var(--cor) 55%, var(--texto)));
      background: var(--selo-fundo, color-mix(in srgb, var(--cor) 12%, transparent));
      border: 1px solid color-mix(in srgb, var(--cor) 35%, transparent);
      border-radius: 999px; padding: 3px 12px 3px 9px; margin-top: 6px;
    }
    i {
      width: 8px; height: 8px; border-radius: 99px; display: inline-block; background: var(--cor);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--cor) 25%, transparent);
    }
  `,
})
export class Selo {
  /** Percentil (0–100) do nível na história. */
  readonly pct = input.required<number>();
  protected readonly classe = computed(() => classificar(this.pct()));
}
