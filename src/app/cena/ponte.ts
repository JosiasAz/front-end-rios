/**
 * Ponte Rio Negro (Ponte Jornalista Phelippe Daou, Manaus) como uma pessoa vê do rio, sem Angular.
 * O horizonte e a outra margem ficam fixos; a água ocupa tudo abaixo do horizonte e o nível do rio aparece
 * nos pilares (na seca eles ficam mais expostos). A escala vertical da ponte é ampliada na faixa do rio
 * (até a cota 40) e comprimida acima dela, para a variação da água aparecer sem perder o mastro.
 * Medidas aproximadas.
 */

export const LARGURA = 1000;
export const ALTURA = 460;
/** Cota do dia típico em Manaus: é onde a água fica quando a estação está na sua mediana. */
export const COTA_TIPICA = 23.8;
const COTA_BASE = -14; // cota no pé do desenho
const QUEBRA = 40; // acima desta cota a escala vertical encolhe
const PX_RIO = 5; // px por metro na vertical, na faixa do rio
const PX_ALTO = 1.05; // px por metro na vertical, acima da quebra
const PX_H = 0.9; // px por metro na horizontal
export const MEIO = LARGURA / 2;
const ALCANCE = 560; // metros mostrados de cada lado do mastro

const Y_QUEBRA = ALTURA - (QUEBRA - COTA_BASE) * PX_RIO;
export const y = (cota: number) =>
  cota <= QUEBRA ? ALTURA - (cota - COTA_BASE) * PX_RIO : Y_QUEBRA - (cota - QUEBRA) * PX_ALTO;
const x = (s: number) => MEIO + s * PX_H;
const f = (n: number) => n.toFixed(1);
const sorte = (() => { let s = 5; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();

/** Horizonte: a linha d'água lá na outra margem, um pouco acima da maior cheia. */
export const HORIZONTE = y(33.5);

/** Tabuleiro: quase reto, subindo de leve até o mastro. */
const pista = (s: number) => 80 - 8 * (s / ALCANCE) ** 2;
const ESPESSURA = 3.5;
const amostras = (passo: number) => {
  const lista: number[] = [];
  for (let s = -ALCANCE; s <= ALCANCE; s += passo) lista.push(s);
  return lista;
};
export const TABULEIRO = (() => {
  const ss = amostras(10);
  const topo = ss.map((s) => `${f(x(s))},${f(y(pista(s)))}`);
  const baixo = ss.slice().reverse().map((s) => `${f(x(s))},${f(y(pista(s) - ESPESSURA))}`);
  return [...topo, ...baixo].join(' ');
})();
export const GUARDA_CORPO = 'M' + amostras(10).map((s) => `${f(x(s))} ${f(y(pista(s) + 1.3))}`).join('L');
/** Postes de luz da pista, que aparecem à noite. */
export const LAMPADAS = amostras(32).map((s) => ({ x: f(x(s)), y: f(y(pista(s) + 1.3)) }));

/** Mastro: torre estreita com uma fenda acima da pista, viga sob a pista e pórtico de duas pernas até a água. */
const TOPO_MASTRO = 192;
const yPista = y(pista(0));
const yTopo = y(TOPO_MASTRO);
const yViga = y(pista(0) - ESPESSURA);
export const MASTRO = {
  torre: `M${MEIO - 7} ${f(yPista)}L${MEIO - 5.5} ${f(yTopo + 4)}L${MEIO} ${f(yTopo)}L${MEIO + 5.5} ${f(yTopo + 4)}L${MEIO + 7} ${f(yPista)}Z`,
  fenda: { x: MEIO - 1.4, y: f(y(186)), w: 2.8, h: f(y(140) - y(186)) },
  viga: { x: MEIO - 16, y: f(yViga), w: 32, h: 6 },
  /** Pernas do pórtico: descem da viga até a linha d'água (altura calculada com o nível). */
  pernas: [{ x: MEIO - 13, w: 7 }, { x: MEIO + 6, w: 7 }],
  topoPernas: yViga + 6,
};

/** Estais em leque: presos na metade de cima do mastro, o mais alto vai até o ponto mais distante da pista. */
export const ESTAIS = (() => {
  const N = 22;
  const linhas: string[] = [];
  for (const lado of [-1, 1]) {
    for (let i = 0; i < N; i++) {
      const c = 188 - i * ((188 - 128) / (N - 1));
      const s = lado * (205 - i * ((205 - 20) / (N - 1)));
      linhas.push(`M${f(MEIO + lado * 4)} ${f(y(c))}L${f(x(s))} ${f(y(pista(s)))}`);
    }
  }
  return linhas.join('');
})();

/** Pilares (descem até a linha d'água): os de transição do vão estaiado (±210 m) são mais largos. */
export const PILARES = [-550, -500, -450, -400, -350, -300, -255, -210, 210, 255, 300, 350, 400, 450, 500, 550].map((s) => {
  const largo = Math.abs(s) === 210 ? 10 : 6;
  return { x: +f(x(s) - (largo * PX_H) / 2), w: +f(largo * PX_H), topo: +f(y(pista(s) - ESPESSURA)) };
});

/** Régua de cotas presa no pilar de transição da direita. */
export const REGUA_X = x(210) + 6;

/**
 * Outra margem, como se vê do rio em Manaus: faixa fina de morros com mata, barrancos de terra alaranjada,
 * praia clara na beira d'água, casas, o porto e duas chaminés. Fica no horizonte, fixa.
 */
const morro = (px: number) => 9 + 3.2 * Math.sin(px / 61) + 2 * Math.sin(px / 23 + 1) + (px > 840 ? (px - 840) / 14 : 0);
export const MATA = (() => {
  let d = `M0 ${HORIZONTE}`;
  for (let px = 0; px <= LARGURA; px += 6) d += `L${px} ${f(HORIZONTE - 2 - morro(px) - sorte() * 1.4)}`;
  return d + `L${LARGURA} ${HORIZONTE}Z`;
})();
const TRECHOS_BARRANCO = [[96, 50], [282, 78], [452, 34], [598, 26], [876, 40]];
export const BARRANCOS = TRECHOS_BARRANCO.map(([x0, w]) => {
  // Terra exposta: estreita no alto e larga embaixo, com a borda recortada.
  let d = `M${x0} ${f(HORIZONTE - 1.5)}`;
  for (let k = 0; k <= 6; k++) {
    const t = k / 6;
    const px = x0 + w * (0.18 + 0.64 * t);
    d += `L${f(px)} ${f(HORIZONTE - 2 - morro(px) * (0.7 + 0.25 * Math.sin(t * Math.PI)) + (k % 2) * 1.6)}`;
  }
  return d + `L${x0 + w} ${f(HORIZONTE - 1.5)}Z`;
}).join('');
export const EROSAO = TRECHOS_BARRANCO.map(([x0, w]) =>
  Array.from({ length: Math.floor(w / 7) }, (_, k) =>
    `M${f(x0 + 5 + k * 7 + sorte() * 2)} ${f(HORIZONTE - 2)}l${f(sorte() * 1.4 - 0.7)} ${f(-3 - sorte() * 4)}`).join('')).join('');
const CORES_CASA = ['casa-branca', 'casa-azul', 'casa-vermelha', 'casa-amarela', 'casa-branca', 'casa-branca'];
export const CASAS = Array.from({ length: 52 }, (_, i) => {
  const px = i < 34 ? 520 + sorte() * 260 : 190 + sorte() * 90;
  const w = 1.6 + sorte() * (i % 8 === 0 ? 7 : 3);
  const h = 1.2 + sorte() * (i % 8 === 0 ? 3 : 1.8);
  const base = HORIZONTE - 1.6 - sorte() * 3.5;
  return { x: f(px), y: f(base - h), w: f(w), h: f(h), classe: CORES_CASA[i % CORES_CASA.length] };
});
export const CHAMINES = [{ x: 352, h: 15 }, { x: 368, h: 20 }].map((c) => ({ x: c.x, y: f(HORIZONTE - 3 - c.h), w: 2.2, h: c.h }));
/** Luzes da cidade à noite: nas casas e no porto, nunca no meio da mata. */
export const LUZES = CASAS.filter((_, i) => i % 3 !== 2).map((c) => ({ x: f(+c.x + +c.w / 2), y: f(+c.y + 0.8) }));
/** Balsas paradas no porto e uma lancha com rastro, na linha d'água da outra margem. */
export const BALSAS = [[560, 30], [596, 18], [660, 34], [712, 16]].map(([x0, w]) => ({
  casco: `M${x0} -1.6H${x0 + w}L${x0 + w - 1} 0.4H${x0 + 0.6}Z`,
  carga: Array.from({ length: Math.floor(w / 5) }, (_, k) => `M${x0 + 1.5 + k * 5} -1.6h4v-1.6h-4z`).join(''),
}));
export const LANCHA = { casco: 'M905 -1h7l-1.4 1.4h-5z', rastro: 'M912 0q16 .8 40 -.2' };

/** Nuvens de chuva da Amazônia (cúmulos): grupos de bolhas. */
export const NUVENS = [
  { x: 120, y: 58, s: 1.3 }, { x: 330, y: 34, s: 0.9 }, { x: 640, y: 50, s: 1.5 }, { x: 900, y: 30, s: 0.8 },
].map((n) => ({
  t: `translate(${n.x} ${n.y}) scale(${n.s})`,
  bolhas: [[0, 0, 26], [-26, 8, 18], [24, 6, 20], [46, 12, 14], [-46, 14, 12], [8, 12, 22]],
}));

/** Sol (ou lua) e o caminho de brilho que ele faz na água até a frente. */
export const SOL_X = 700;

/**
 * Barco regional de Manaus (recreio) de lado, com a proa à esquerda e a linha d'água na origem:
 * três andares brancos, casco e faixas vermelhas, guarda-corpos, lona azul, pneus no costado,
 * botes salva-vidas vermelhos no teto e o mastro de antena na proa. Cerca de 120 unidades de comprimento.
 */
const grade = (x0: number, x1: number, topo: number, base: number, passo: number, trilhos: number[]) => {
  let d = '';
  for (let px = x0; px <= x1 + 0.01; px += passo) d += `M${f(px)} ${base}V${topo}`;
  for (const t of trilhos) d += `M${x0} ${t}H${x1}`;
  return d;
};
const lona = (x0: number, x1: number, yy: number) => {
  let d = `M${x0} ${yy - 2}H${x1}V${yy}`;
  for (let px = x1; px > x0; px -= 6) d += `Q${px - 3} ${yy + 2} ${px - 6} ${yy}`;
  return d + 'Z';
};
export const BARCO = {
  casco: 'M-64 -17Q-61 -5-51 2L54 2Q59 1 60-4V-17Z',
  cascoVermelho: 'M-58.5 -7Q-56 -2-51 2L54 2Q59 1 60-4V-6H-50Q-55 -6-58.5 -7Z',
  frisos: 'M-62 -13H60M-63 -16.5H60',
  leme: 'M58 -3H67L65.5 1H58Z',
  // Andar 1 (porão de redes): aberto na frente, fechado na popa.
  interior1: { x: -55, y: -28, w: 73, h: 11 },
  popa1: 'M18 -29H60V-17H18Z',
  grade1: grade(-55, 18, -28, -17, 4.5, [-20.5, -24]),
  // Andar 2.
  piso2: { x: -58, y: -31, w: 118, h: 2.2 },
  lona1: lona(-56, 18, -29),
  interior2: { x: -52, y: -41.5, w: 70, h: 10.5 },
  popa2: 'M18 -42.5H58.5V-31H18Z',
  grade2: grade(-52, 18, -41.5, -31, 4.5, [-34.5, -38]),
  // Andar 3: cabine de comando na frente, convés aberto atrás com os botes.
  piso3: { x: -53, y: -44.5, w: 112, h: 2.2 },
  lona2: lona(-52, 18, -42.5),
  cabine: 'M-49 -55H-8V-44.5H-49Z',
  portas: 'M-44 -53h3v7h-3zM-34 -53h3v7h-3zM-24 -53h3v7h-3zM-15 -53h3v7h-3z',
  grade3: grade(-8, 58, -51.5, -44.5, 4.5, [-48, -51.5]),
  teto: 'M-51 -57H-6V-55H-51Z',
  botes: 'M2 -57.5h20a4 4 0 0 1 4 4v3h-28v-3a4 4 0 0 1 4-4zM30 -58.5h20a4 4 0 0 1 4 4v4h-28v-4a4 4 0 0 1 4-4z',
  frisoPopa: 'M18 -23H60M18 -36.5H58.5',
  vigias: 'M26 -27h3v1.4h-3zM36 -27h3v1.4h-3zM46 -27h3v1.4h-3zM28 -40h3v1.4h-3zM40 -40h3v1.4h-3z',
  mastro: 'M-38 -57L-29 -82M-35 -71L-25 -74M-29 -82L-63 -18',
  antena: 'M-2 -57V-63M-8 -64Q-2 -60 4 -64Z',
  // Pneus pendurados no costado, com as cordas.
  esteira: 'M58 1.5q9 2.5 20 .5q8-1.5 16 .5M56 4q12 3 28 .5',
  pneus: Array.from({ length: 10 }, (_, i) => ({ x: -52 + i * 9.4, y: -10 })),
  cordas: Array.from({ length: 10 }, (_, i) => `M${f(-52 + i * 9.4)} -17V-13.4`).join(''),
};

/**
 * Reflexo de uma luz na água (lua, sol ou o LED do mastro): muitos brilhos soltos nas cristas das ondas,
 * concentrados no centro e rareando para os lados, estreito perto da fonte e abrindo para a frente.
 * As linhas ficam mais espaçadas perto de quem olha (perspectiva). Mesma semente, mesmo desenho.
 */
export function brilhos(cx: number, y0: number, y1: number, abertura0: number, abertura1: number, linhas: number, semente: number) {
  let s = semente;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-6)) * Math.cos(2 * Math.PI * r());
  const lista: { x: string; y: string; w: string; h: string; o: string; c: string }[] = [];
  for (let k = 0; k < linhas; k++) {
    const t = (k + r() * 0.6) / linhas;
    const yy = y0 + (y1 - y0) * t ** 1.6;
    const abre = abertura0 + (abertura1 - abertura0) * t;
    const quantos = 3 + Math.floor(r() * 4);
    for (let q = 0; q < quantos; q++) {
      const dx = gauss() * abre;
      const perto = Math.exp(-((dx / abre) ** 2) * 0.9);
      const w = (2 + t * 15) * (0.4 + r() * 0.9) * (0.5 + perto * 0.7);
      const o = perto * (1 - 0.35 * t) * (0.45 + r() * 0.55);
      if (o < 0.05) continue;
      lista.push({ x: f(cx + dx - w / 2), y: f(yy), w: f(w), h: f(0.7 + t * 1.5), o: o.toFixed(2), c: `c${Math.floor(r() * 4)}` });
    }
  }
  return lista;
}
