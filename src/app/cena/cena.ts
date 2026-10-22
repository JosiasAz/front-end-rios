import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { ALTURA_PESSOA, atalhos, dataBR, fmt, frasePercentil, frasePessoa, percentil, selecaoDoDia } from '../nivel';
import { Referencia, Selecao, Serie } from '../rios.models';
import { Selo } from '../selo/selo';

// Cena em coordenadas fixas (viewBox 800 x 460); a água e o leito seguem até BASE, abaixo da tela.
const TOPO = 16;
const FUNDO = 460;
const BASE = 470;
const REGUA = 700;
/** Silhueta em centímetros com os pés na origem (cabeça é um círculo à parte). */
export const CORPO = [
  { x: -15, y: -142, w: 30, h: 62, rx: 12 },
  { x: -24, y: -138, w: 9, h: 56, rx: 4.5 },
  { x: 15, y: -138, w: 9, h: 56, rx: 4.5 },
  { x: -13, y: -88, w: 12, h: 88, rx: 6 },
  { x: 1, y: -88, w: 12, h: 88, rx: 6 },
];
const ESCALA_CORPO = 1.1; // px por cm no painel ampliado
const PES_CORPO = 210;

/** Corte da margem com uma pessoa de 1,70 m em pé na cota do dia típico e a água no nível escolhido. */
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

  protected readonly corpo = CORPO;
  protected readonly pesCorpo = PES_CORPO;
  protected readonly escalaCorpo = ESCALA_CORPO;
  /** Cota desenhada agora (anima até a cota da seleção). */
  protected readonly cota = signal<number | null>(null);

  constructor() {
    const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
    effect((onCleanup) => {
      const alvo = this.selecao().cota;
      const de = untracked(this.cota);
      if (de === null || reduzir) {
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

  /** Partes fixas da cena: escala vertical, margem, linhas de referência, pessoa e régua. */
  private readonly base = computed(() => {
    const d = this.dados();
    const ref = this.referencia();
    const lo = Math.min(ref.recorde_minimo_m, d.minimo_m) - 3;
    const hi = Math.max(ref.recorde_maximo_m, d.maximo_m, ref.mediana_m + ALTURA_PESSOA) + 3;
    const y = (c: number) => TOPO + ((hi - c) / (hi - lo)) * (FUNDO - TOPO);
    // Margem em rampa: de x=70 (cota hi) a x=640 (cota lo), seguindo para baixo fora da tela.
    const xMargem = (c: number) => 70 + ((hi - c) / (hi - lo)) * 570;
    const pxPorM = (FUNDO - TOPO) / (hi - lo);
    const xLeito = xMargem(lo - (BASE - FUNDO) / pxPorM);

    const nomeMax = ref.aproximada ? 'máximo do período' : 'cheia recorde';
    const nomeMin = ref.aproximada ? 'mínimo do período' : 'seca recorde';
    const refs = ([
      [ref.recorde_maximo_m, `${nomeMax} ${ref.data_recorde_maximo.slice(0, 4)} · ${fmt(ref.recorde_maximo_m)} m`],
      [ref.mediana_m, `dia típico · ${fmt(ref.mediana_m)} m`],
      [ref.recorde_minimo_m, `${nomeMin} ${ref.data_recorde_minimo.slice(0, 4)} · ${fmt(ref.recorde_minimo_m)} m`],
    ] as const).map(([c, rotulo]) => {
      const x = xMargem(c);
      const direita = x > 420; // perto da régua o rótulo vai para o lado da terra
      return { x, y: y(c), rotulo, tx: direita ? x - 8 : x + 8, ancora: direita ? 'end' : 'start' };
    });

    const ticks = [];
    for (let c = Math.ceil(lo); c <= hi; c++) ticks.push({ c, y: y(c), par: c % 2 === 0 });

    return {
      y, xMargem, xLeito, refs, ticks,
      reguaTopo: y(hi),
      terra: `0,${y(hi)} 70,${y(hi)} ${xLeito},${BASE} 0,${BASE}`,
      pessoa: `translate(${xMargem(ref.mediana_m) - 4} ${y(ref.mediana_m)}) scale(${pxPorM / 100})`,
    };
  });

  /** Água no nível animado. */
  protected readonly cena = computed(() => {
    const b = this.base();
    const c = this.cota() ?? this.selecao().cota;
    const yw = b.y(c);
    return {
      ...b,
      yAgua: yw,
      xAgua: b.xMargem(c),
      agua: `${b.xMargem(c)},${yw} 800,${yw} 800,${BASE} ${b.xLeito},${BASE}`,
      rotuloAgua: `${fmt(c)} m`,
    };
  });

  /** Painel ampliado: altura da água no corpo da pessoa. */
  protected readonly painel = computed(() => {
    const c = this.cota() ?? this.selecao().cota;
    const h = c - this.referencia().mediana_m;
    const topo = h > 0 ? Math.max(0, PES_CORPO - h * 100 * ESCALA_CORPO) : null;
    const texto = h <= 0 ? `↓ água ${fmt(-h)} m abaixo dos pés`
      : h > ALTURA_PESSOA ? `↑ ${fmt(h - ALTURA_PESSOA)} m de água acima da cabeça`
      : `água a ${fmt(h)} m de altura no corpo`;
    return { topo, texto, pct: percentil(this.referencia(), c) };
  });

  protected readonly legenda = computed(() => {
    const s = this.selecao();
    const ref = this.referencia();
    const quando = s.atalho === 'hoje' ? `Hoje (${dataBR(s.data)})` : s.rotulo;
    const desde = ref.aproximada ? ' no período escolhido' : ` desde ${ref.periodo.inicio.slice(0, 4)}`;
    return `${quando}: a régua marca ${fmt(s.cota)} m. Em pé onde a água chega num dia típico ` +
      `(${fmt(ref.mediana_m)} m), ${frasePessoa(ref, s.cota)}. Esse nível é ` +
      `${frasePercentil(percentil(ref, s.cota))}${desde}.`;
  });

  protected escolherDia(ev: Event) {
    this.selecionar.emit(selecaoDoDia(this.dados(), +(ev.target as HTMLInputElement).value));
  }
}
