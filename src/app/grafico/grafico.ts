import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, output, signal } from '@angular/core';
import { MESES, dataBR, fmt } from '../nivel';
import { Ponto, Referencia, Selecao, Serie } from '../rios.models';

const DIA_MS = 864e5;

/** Nível diário (mediana + faixa mín–máx) com mira de hover; clique escolhe o dia da cena. */
@Component({
  selector: 'app-grafico',
  templateUrl: './grafico.html',
  styleUrl: './grafico.css',
})
export class Grafico {
  readonly dados = input.required<Serie>();
  readonly referencia = input.required<Referencia>();
  readonly selecao = input<Selecao | null>(null);
  readonly anos = input(3);
  /** Índice do dia clicado em `dados().serie`. */
  readonly dia = output<number>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly largura = signal(800);
  protected readonly hover = signal<number | null>(null);

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const obs = new ResizeObserver(([e]) => this.largura.set(Math.round(e.contentRect.width)));
      obs.observe(this.host.nativeElement);
      destroy.onDestroy(() => obs.disconnect());
    });
  }

  protected readonly geo = computed(() => {
    const s = this.dados().serie;
    const ref = this.referencia();
    const W = Math.max(300, this.largura());
    const H = W < 560 ? 260 : 320;
    const m = { t: 18, r: 12, b: 28, l: 40 };
    const tempos = s.map((p) => Date.parse(p[0]));
    const t0 = tempos[0];
    const t1 = tempos[tempos.length - 1];

    let lo = Math.min(...s.map((p) => p[2]), ref.mediana_m);
    let hi = Math.max(...s.map((p) => p[3]), ref.mediana_m);
    const passo = hi - lo > 12 ? 4 : 2;
    lo = Math.floor(lo / passo) * passo;
    hi = Math.ceil(hi / passo) * passo;
    const x = (t: number) => m.l + ((t - t0) / (t1 - t0 || 1)) * (W - m.l - m.r);
    const y = (v: number) => m.t + ((hi - v) / (hi - lo)) * (H - m.t - m.b);

    const gradeY = [];
    for (let v = lo; v <= hi; v += passo) gradeY.push({ v, y: y(v), rotulo: `${v} m`, base: v === lo });

    // Quantos rótulos de mês por ano cabem (1, 2, 3 ou 4) sem encavalar.
    const porAno = Math.max(1, Math.min(4, Math.floor((W - m.l - m.r) / (this.anos() * 55))));
    const meses = [[0], [0, 6], [0, 4, 8], [0, 3, 6, 9]][porAno - 1];
    const ticksX = [];
    const ini = new Date(t0);
    for (let a = ini.getFullYear(), mm = ini.getMonth() + 1; ; mm++) {
      if (mm > 11) { mm = 0; a++; }
      const t = Date.UTC(a, mm, 1);
      if (t > t1) break;
      if (meses.includes(mm)) ticksX.push({ x: x(t), rotulo: `${MESES[mm]}/${String(a).slice(2)}` });
    }

    // Quebra a linha em lacunas de mais de 3 dias.
    const partes: Ponto[][] = [[]];
    s.forEach((p, i) => {
      if (i && (tempos[i] - tempos[i - 1]) / DIA_MS > 3) partes.push([]);
      partes[partes.length - 1].push(p);
    });
    const pt = (p: Ponto, v: number) => `${x(Date.parse(p[0]))},${y(v)}`;
    const faixas = partes.map((parte) =>
      [...parte.map((p) => pt(p, p[3])), ...parte.slice().reverse().map((p) => pt(p, p[2]))].join(' '));
    const linhas = partes.map((parte) => parte.map((p) => pt(p, p[1])).join(' '));

    const sel = this.selecao();
    const ts = sel ? Date.parse(sel.data) : NaN;
    const marca = sel && ts >= t0 && ts <= t1 ? { x: x(ts), y: y(sel.cota) } : null;

    return {
      W, H, m, x, y, tempos, t0, t1, gradeY, ticksX, faixas, linhas, marca,
      mediana: {
        y: y(ref.mediana_m),
        rotulo: `${ref.aproximada ? 'mediana do período' : 'dia típico (mediana histórica)'} ${fmt(ref.mediana_m)} m`,
      },
    };
  });

  protected readonly titulo = computed(() => {
    const p = this.dados().periodo;
    return `Nível diário · ${dataBR(p.inicio)} a ${dataBR(p.fim)}`;
  });

  protected readonly dica = computed(() => {
    const i = this.hover();
    if (i === null) return null;
    const g = this.geo();
    const p = this.dados().serie[i];
    if (!p) return null;
    const x = g.x(g.tempos[i]);
    return {
      x,
      y: g.y(p[1]),
      topo: Math.max(0, g.y(p[1]) - 30),
      esquerda: x > g.W * 0.65,
      valor: `${fmt(p[1])} m`,
      data: dataBR(p[0]),
      faixa: `no dia: ${fmt(p[2])} a ${fmt(p[3])} m`,
    };
  });

  private indice(ev: MouseEvent): number {
    const g = this.geo();
    const caixa = (ev.currentTarget as SVGElement).getBoundingClientRect();
    const px = ((ev.clientX - caixa.left) / caixa.width) * g.W;
    const t = g.t0 + ((px - g.m.l) / (g.W - g.m.l - g.m.r)) * (g.t1 - g.t0);
    // Busca binária do dia mais próximo.
    const ts = g.tempos;
    let a = 0;
    let b = ts.length - 1;
    while (b - a > 1) {
      const c = (a + b) >> 1;
      if (ts[c] < t) a = c; else b = c;
    }
    return t - ts[a] < ts[b] - t ? a : b;
  }

  protected mover(ev: PointerEvent) {
    this.hover.set(this.indice(ev));
  }

  protected clicar(ev: MouseEvent) {
    this.dia.emit(this.indice(ev));
  }

  protected focar() {
    this.hover.set(this.dados().serie.length - 1);
  }

  protected tecla(ev: KeyboardEvent) {
    const n = this.dados().serie.length;
    const passo = ({ ArrowLeft: -1, ArrowRight: 1, PageDown: -30, PageUp: 30 } as Record<string, number>)[ev.key];
    if (passo) {
      ev.preventDefault();
      this.hover.set(Math.min(n - 1, Math.max(0, (this.hover() ?? n - 1) + passo)));
    } else if (ev.key === 'Enter' && this.hover() !== null) {
      this.dia.emit(this.hover()!);
    }
  }
}
