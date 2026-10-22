import { Component, computed, input } from '@angular/core';
import { MESES_LONGOS, dataBR, fmt, fmtSinal, percentil } from '../nivel';
import { Referencia, Serie } from '../rios.models';
import { Selo } from '../selo/selo';

interface Bloco {
  rotulo: string;
  valor: string;
  detalhe: string;
  pct?: number;
}

/** Blocos de resumo: nível agora, 1 ano atrás, normal da época e posição na história. */
@Component({
  selector: 'app-resumo',
  imports: [Selo],
  template: `
    @for (b of blocos(); track b.rotulo) {
      <div class="bloco">
        <div class="rotulo">{{ b.rotulo }}</div>
        <div class="valor">{{ b.valor }}</div>
        <div class="detalhe">{{ b.detalhe }}</div>
        @if (b.pct !== undefined) {
          <app-selo [pct]="b.pct" />
        }
      </div>
    }
  `,
  styles: `
    :host { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
    .bloco { background: var(--superficie); border: 1px solid var(--borda); border-radius: 12px; padding: 14px 16px; }
    .rotulo, .detalhe { color: var(--texto-2); font-size: 13px; }
    .valor { font-size: 28px; font-weight: 650; letter-spacing: -0.02em; margin-top: 2px; }
    @media (max-width: 720px) { .valor { font-size: 24px; } }
  `,
})
export class Resumo {
  readonly dados = input.required<Serie>();
  readonly referencia = input.required<Referencia>();

  protected readonly blocos = computed<Bloco[]>(() => {
    const d = this.dados();
    const ref = this.referencia();
    const mes = +d.data_atual.slice(5, 7) - 1;
    const normal = ref.mediana_por_mes_m[mes];
    const tendencia = d.tendencia_15d === 'estável'
      ? 'estável nos últimos 15 dias'
      : `${d.tendencia_15d}: ${fmtSinal(d.variacao_15d_m)} m em 15 dias`;
    const pct = percentil(ref, d.atual_m);
    const lista: Bloco[] = [
      { rotulo: 'Nível agora', valor: `${fmt(d.atual_m)} m`, detalhe: `${dataBR(d.data_atual)} · ${tendencia}` },
    ];
    if (d.ha_1_ano_m !== null && d.diferenca_1_ano_m !== null) {
      lista.push({
        rotulo: 'Comparado a 1 ano atrás',
        valor: `${fmtSinal(d.diferenca_1_ano_m)} m`,
        detalhe: `Há 1 ano estava em ${fmt(d.ha_1_ano_m)} m`,
      });
    }
    if (normal !== null) {
      lista.push({
        rotulo: `Normal para ${MESES_LONGOS[mes]}`,
        valor: `${fmt(normal)} m`,
        detalhe: `Hoje está ${fmt(Math.abs(d.atual_m - normal))} m ${d.atual_m < normal ? 'abaixo' : 'acima'} do normal da época`,
      });
    }
    lista.push({
      rotulo: ref.aproximada ? 'No período escolhido' : `Na história (desde ${ref.periodo.inicio.slice(0, 4)})`,
      valor: `${Math.round(pct >= 50 ? pct : 100 - pct)}%`,
      detalhe: `dos dias ${pct >= 50 ? 'ficaram abaixo' : 'ficaram acima'} do nível de hoje`,
      pct,
    });
    return lista;
  });
}
