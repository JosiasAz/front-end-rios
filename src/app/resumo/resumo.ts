import { Component, computed, input } from '@angular/core';
import { MESES_LONGOS, dataBR, fmt, fmtSinal, percentil } from '../nivel';
import { Referencia, Serie } from '../rios.models';
import { Selo } from '../selo/selo';

interface Bloco {
  rotulo: string;
  valor: string;
  detalhe: string;
  icone: 'agora' | 'ano' | 'normal' | 'historia';
  pct?: number;
  /** Cor do valor quando ele é uma variação. */
  tom?: 'sobe' | 'desce';
}

/** Blocos de resumo: nível agora, 1 ano atrás, normal da época e posição na história. */
@Component({
  selector: 'app-resumo',
  imports: [Selo],
  template: `
    @for (b of blocos(); track b.rotulo) {
      <div class="bloco" [class.principal]="b.icone === 'agora'">
        <div class="topo">
          <span class="rotulo">{{ b.rotulo }}</span>
          <span class="icone" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              @switch (b.icone) {
                @case ('agora') { <path d="M3 15c2 0 2-1.5 4.5-1.5S10 15 12 15s2.5-1.5 4.5-1.5S19 15 21 15M3 19.5c2 0 2-1.5 4.5-1.5s2.5 1.5 4.5 1.5 2.5-1.5 4.5-1.5 2.5 1.5 4.5 1.5M12 3v7m-3-3 3 3 3-3" /> }
                @case ('ano') { <rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /> }
                @case ('normal') { <path d="M3 12h3l3-7 4 14 3-7h5" /> }
                @case ('historia') { <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /> }
              }
            </svg>
          </span>
        </div>
        <div class="valor" [attr.data-tom]="b.tom">{{ b.valor }}</div>
        <div class="detalhe">{{ b.detalhe }}</div>
        @if (b.pct !== undefined) {
          <app-selo [pct]="b.pct" />
        }
      </div>
    }
  `,
  styles: `
    :host { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; }
    .bloco {
      position: relative; overflow: hidden; min-width: 0;
      background: var(--superficie); border: 1px solid var(--borda); border-radius: var(--raio);
      box-shadow: var(--sombra-2); padding: 18px 20px 20px;
      transition: transform .3s var(--suave), box-shadow .3s var(--suave);
      animation: surgir .6s var(--suave) both;
    }
    .bloco:nth-child(2) { animation-delay: .06s; }
    .bloco:nth-child(3) { animation-delay: .12s; }
    .bloco:nth-child(4) { animation-delay: .18s; }
    .bloco:hover { transform: translateY(-3px); box-shadow: var(--sombra-3); }
    .principal {
      background:
        radial-gradient(140% 120% at 100% 0%, color-mix(in srgb, var(--agua) 14%, transparent), transparent 60%),
        var(--superficie);
    }
    .principal::before {
      content: ""; position: absolute; inset: 0 0 auto; height: 3px;
      background: linear-gradient(90deg, var(--agua), var(--agua-topo));
    }
    .topo { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .rotulo { color: var(--texto-2); font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
    .icone {
      flex: none; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center;
      color: var(--serie); background: color-mix(in srgb, var(--serie) 12%, transparent);
    }
    .icone svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .valor {
      font: 700 32px/1.1 var(--fonte-titulo); letter-spacing: -0.03em; margin-top: 10px;
      font-variant-numeric: tabular-nums;
    }
    .valor[data-tom="sobe"] { color: var(--serie); }
    .valor[data-tom="desce"] { color: var(--selecao); }
    .detalhe { color: var(--texto-2); font-size: 13px; margin-top: 4px; }
    @media (max-width: 720px) { .valor { font-size: 28px; } }
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
      { icone: 'agora', rotulo: 'Nível agora', valor: `${fmt(d.atual_m)} m`, detalhe: `${dataBR(d.data_atual)} · ${tendencia}` },
    ];
    if (d.ha_1_ano_m !== null && d.diferenca_1_ano_m !== null) {
      lista.push({
        icone: 'ano',
        rotulo: 'Comparado a 1 ano atrás',
        valor: `${fmtSinal(d.diferenca_1_ano_m)} m`,
        detalhe: `Há 1 ano estava em ${fmt(d.ha_1_ano_m)} m`,
        tom: d.diferenca_1_ano_m > 0 ? 'sobe' : d.diferenca_1_ano_m < 0 ? 'desce' : undefined,
      });
    }
    if (normal !== null) {
      lista.push({
        icone: 'normal',
        rotulo: `Normal para ${MESES_LONGOS[mes]}`,
        valor: `${fmt(normal)} m`,
        detalhe: `Hoje está ${fmt(Math.abs(d.atual_m - normal))} m ${d.atual_m < normal ? 'abaixo' : 'acima'} do normal da época`,
      });
    }
    lista.push({
      icone: 'historia',
      rotulo: ref.aproximada ? 'No período escolhido' : `Na história (desde ${ref.periodo.inicio.slice(0, 4)})`,
      valor: `${Math.round(pct >= 50 ? pct : 100 - pct)}%`,
      detalhe: `dos dias ${pct >= 50 ? 'ficaram abaixo' : 'ficaram acima'} do nível de hoje`,
      pct,
    });
    return lista;
  });
}
