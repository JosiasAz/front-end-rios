import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { atalhos, dataBR, fmt, frasePercentil, percentil, selecaoDoDia } from '../nivel';
import { Referencia, Selecao, Serie } from '../rios.models';
import { Selo } from '../selo/selo';
import * as P from './ponte';

/**
 * Textura de ondas (cristas claras e cavados escuros) gerada uma vez pelo navegador como imagem e repetida
 * sem emenda. Depois ela só desliza, o que a placa de vídeo faz sem redesenhar nada.
 */
function ruido(frequencia: string, semente: number) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='160'>` +
    `<filter id='f' x='0' y='0' width='100%' height='100%'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='${frequencia}' numOctaves='3' seed='${semente}' stitchTiles='stitch' result='r'/>` +
    `<feColorMatrix in='r' type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 3.4 -1.9' result='c'/>` +
    `<feColorMatrix in='r' type='matrix' values='0 0 0 0 0  0 0 0 0 .02  0 0 0 0 .08  0 0 0 -3 1.3' result='v'/>` +
    `<feMerge><feMergeNode in='v'/><feMergeNode in='c'/></feMerge></filter>` +
    `<rect width='100%' height='100%' filter='url(#f)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Leito no meio do canal, sob a ponte (ilustrativo), na cota de Manaus. */
const LEITO_CANAL = -10;

/**
 * Ponte Rio Negro (Manaus) como uma pessoa vê do rio, com a água no nível escolhido, e um corte do rio com a
 * profundidade. Vale para todas as estações: a água fica na altura de um dia típico em Manaus e sobe ou desce
 * o quanto a estação varia em relação ao dia típico dela.
 */
@Component({
  selector: 'app-cena',
  imports: [Selo],
  templateUrl: './cena.html',
  styleUrl: './cena.css',
})
export class Cena {
  readonly dados = input.required<Serie>();
  readonly referencia = input.required<Referencia>();
  readonly selecao = input.required<Selecao>();
  readonly selecionar = output<Selecao>();

  protected readonly p = P;
  /** Sem água animada se o sistema pedir menos movimento. */
  protected readonly reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** Ondas: a mesma textura bem miúda ao longe e larga perto (dá a perspectiva). */
  protected readonly ruidoLonge = ruido('0.02 0.12', 9);
  protected readonly ruidoPerto = ruido('0.012 0.07', 4);
  /** Cota desenhada agora (anima até a cota da seleção). */
  protected readonly cota = signal<number | null>(null);

  constructor() {
    effect((onCleanup) => {
      const alvo = this.selecao().cota;
      const de = untracked(this.cota);
      if (de === null || this.reduzir) {
        this.cota.set(alvo);
        return;
      }
      const inicio = performance.now();
      let quadro = 0;
      const passo = (agora: number) => {
        const f = Math.min(1, (agora - inicio) / 700);
        this.cota.set(de + (alvo - de) * (1 - Math.pow(1 - f, 3)));
        if (f < 1) quadro = requestAnimationFrame(passo);
      };
      quadro = requestAnimationFrame(passo);
      onCleanup(() => cancelAnimationFrame(quadro));
    });
  }

  protected readonly atalhos = computed(() => atalhos(this.dados(), this.referencia()));

  protected readonly indiceDia = computed(() => this.dados().serie.findIndex((p) => p[0] === this.selecao().data));

  protected readonly rotuloDia = computed(() => (this.indiceDia() >= 0 ? dataBR(this.selecao().data) : 'fora do período'));

  /** Altura na cena (cota em Manaus) de uma cota da estação escolhida. */
  private readonly naPonte = computed(() => {
    const mediana = this.referencia().mediana_m;
    return (c: number) => P.COTA_TIPICA + (c - mediana);
  });

  /** Marcas de referência (cheia recorde, dia típico, seca recorde), em cota da estação. */
  private readonly marcos = computed(() => {
    const ref = this.referencia();
    const max = ref.aproximada ? 'máx.' : 'cheia';
    const min = ref.aproximada ? 'mín.' : 'seca';
    return [
      { c: ref.recorde_maximo_m, rotulo: `${max} ${ref.data_recorde_maximo.slice(0, 4)}`, classe: 'marco-cheia' },
      { c: ref.mediana_m, rotulo: 'típico', classe: 'marco-tipico' },
      { c: ref.recorde_minimo_m, rotulo: `${min} ${ref.data_recorde_minimo.slice(0, 4)}`, classe: 'marco-seca' },
    ];
  });

  /** Água no nível animado. */
  protected readonly agua = computed(() => {
    const c = this.cota() ?? this.selecao().cota;
    const h = c - this.referencia().mediana_m;
    const nivel = this.naPonte()(c);
    const yw = P.y(nivel);
    // Na seca a praia da outra margem fica mais larga e a água começa um pouco abaixo do horizonte.
    const praia = 1.4 + Math.max(0, P.COTA_TIPICA + 6 - nivel) * 0.22;
    const longe = P.HORIZONTE + praia;
    return {
      y: yw,
      longe,
      praia: { y: P.HORIZONTE - 1.4, h: praia + 1.4 },
      altura: P.ALTURA - longe,
      pilares: P.PILARES.map((q) => ({ ...q, h: Math.max(0, yw - q.topo) })),
      pernas: P.MASTRO.pernas.map((pe) => ({ ...pe, y: P.MASTRO.topoPernas, h: Math.max(0, yw - P.MASTRO.topoPernas) })),
      // Reflexo de cada pilar, da linha d'água para baixo.
      reflexos: P.PILARES.map((q) => ({ x: q.x, w: q.w, h: Math.min(110, (yw - q.topo) * 0.9) })),
      // Reflexos de luz: brilhos soltos (gerados sempre com a mesma semente) e uma claridade difusa por baixo.
      // Dois conjuntos (a e b) que se alternam para a luz cintilar.
      led: {
        a: P.brilhos(P.MEIO, yw + 1, P.ALTURA, 8, 50, 70, 11),
        b: P.brilhos(P.MEIO, yw + 1, P.ALTURA, 8, 50, 70, 37),
        halo: { cy: (yw + P.ALTURA) / 2, ry: (P.ALTURA - yw) / 2 },
      },
      astro: {
        a: P.brilhos(P.SOL_X, longe + 1, P.ALTURA, 3, 70, 70, 23),
        b: P.brilhos(P.SOL_X, longe + 1, P.ALTURA, 3, 70, 70, 57),
        halo: { cy: (longe + P.ALTURA) / 2, ry: (P.ALTURA - longe) / 2 },
      },
      porto: `translate(0 ${longe})`,
      cota: `${fmt(c)} m`,
      texto: Math.abs(h) < 0.005 ? 'no nível de um dia típico'
        : `${fmt(Math.abs(h))} m ${h > 0 ? 'acima' : 'abaixo'} do dia típico`,
      pct: percentil(this.referencia(), c),
      nivel,
    };
  });

  /** Posição (em % da cena) das camadas animadas: ondas ao longe, ondas perto e a linha do barco. */
  protected readonly camadas = computed(() => {
    const { y: yw, longe } = this.agua();
    const pct = (v: number) => (v / P.ALTURA) * 100;
    return {
      longe: { top: pct(longe), altura: pct(yw + 24 - longe) },
      perto: { top: pct(yw - 6), altura: pct(P.ALTURA - yw + 6) },
      barco: pct(yw + 16),
    };
  });

  /** Régua no pilar: só a parte fora d'água aparece; marcas de 1 em 1 m e os marcos ao lado. */
  protected readonly regua = computed(() => {
    const ref = this.referencia();
    const naPonte = this.naPonte();
    const yw = this.agua().y;
    const marcas = [];
    for (let c = Math.ceil(ref.recorde_minimo_m - 1); c <= Math.floor(ref.recorde_maximo_m + 2); c++) {
      const yy = P.y(naPonte(c));
      if (yy < yw - 1) marcas.push({ c, y: yy, par: c % 2 === 0 });
    }
    const topo = P.y(naPonte(Math.floor(ref.recorde_maximo_m + 2))) - 4;
    const marcos = this.marcos().map((m) => ({ ...m, y: P.y(naPonte(m.c)), submerso: P.y(naPonte(m.c)) > yw }));
    return { marcas, topo, altura: Math.max(0, yw - topo), marcos };
  });

  /** Corte do rio sob a ponte: margens, leito e a água no nível, com a profundidade no canal. */
  protected readonly corte = computed(() => {
    const nivel = this.agua().nivel;
    const naPonte = this.naPonte();
    // Cotas de -12 a 36 ocupam o quadro de 96 a 6 na vertical.
    const yc = (c: number) => 96 - ((c + 12) / 48) * 90;
    const t = yc(34);
    const fundo = yc(LEITO_CANAL);
    const meio = (t + fundo) / 2;
    return {
      terra: `M0 100V${t}H20Q38 ${t + 6} 50 ${meio}Q64 ${fundo} 80 ${fundo}Q96 ${fundo} 110 ${meio}Q122 ${t + 6} 140 ${t}H160V100Z`,
      y: yc(nivel),
      leitoY: yc(LEITO_CANAL),
      prof: `${fmt(nivel - LEITO_CANAL, 0)} m`,
      marcos: this.marcos().map((m) => ({ ...m, y: yc(naPonte(m.c)) })),
    };
  });

  protected readonly legenda = computed(() => {
    const s = this.selecao();
    const ref = this.referencia();
    const quando = s.atalho === 'hoje' ? `Hoje (${dataBR(s.data)})` : s.rotulo;
    const desde = ref.aproximada ? ' no período escolhido' : ` desde ${ref.periodo.inicio.slice(0, 4)}`;
    const h = s.cota - ref.mediana_m;
    const relacao = Math.abs(h) < 0.005 ? 'no nível de um dia típico'
      : `${fmt(Math.abs(h))} m ${h > 0 ? 'acima' : 'abaixo'} de um dia típico (${fmt(ref.mediana_m)} m)`;
    return `${quando}: a régua marca ${fmt(s.cota)} m, ${relacao}. Esse nível é ` +
      `${frasePercentil(percentil(ref, s.cota))}${desde}.`;
  });

  protected escolherDia(ev: Event) {
    this.selecionar.emit(selecaoDoDia(this.dados(), +(ev.target as HTMLInputElement).value));
  }
}
