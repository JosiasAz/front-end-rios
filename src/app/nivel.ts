/** Formatação e regras de comparação do nível do rio (funções puras, sem Angular). */
import { Referencia, Selecao, Serie } from './rios.models';

export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto',
  'setembro', 'outubro', 'novembro', 'dezembro'];
export const ALTURA_PESSOA = 1.7;

export const fmt = (n: number, casas = 2) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const fmtSinal = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));

export function dataBR(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${+d} ${MESES[+m - 1]} ${a}`;
}

/** Referência calculada só com o período carregado, enquanto o histórico não chega. */
export function refDoPeriodo(d: Serie): Referencia {
  const v = d.serie.map((p) => p[1]).sort((a, b) => a - b);
  const q = (p: number) => v[Math.round(p * (v.length - 1))];
  const porMes: number[][] = Array.from({ length: 12 }, () => []);
  d.serie.forEach((p) => porMes[+p[0].slice(5, 7) - 1].push(p[1]));
  const mediana = (a: number[]) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : null);
  return {
    aproximada: true,
    completo: false,
    periodo: d.periodo,
    recorde_maximo_m: d.maximo_m,
    data_recorde_maximo: d.data_maximo,
    recorde_minimo_m: d.minimo_m,
    data_recorde_minimo: d.data_minimo,
    mediana_m: q(0.5),
    percentis_m: Array.from({ length: 21 }, (_, i) => q(i / 20)),
    mediana_por_mes_m: porMes.map(mediana),
  };
}

/** Percentual (0–100) dos dias registrados com cota abaixo de `cota`, interpolando os percentis. */
export function percentil(ref: Referencia, cota: number): number {
  const p = ref.percentis_m;
  if (cota <= p[0]) return 0;
  if (cota >= p[20]) return 100;
  for (let i = 0; i < 20; i++) {
    if (cota <= p[i + 1]) {
      const f = p[i + 1] === p[i] ? 0 : (cota - p[i]) / (p[i + 1] - p[i]);
      return (i + f) * 5;
    }
  }
  return 100;
}

export interface Classe {
  texto: string;
  /** Cor de status (sempre acompanhada de ícone e texto). */
  cor: string;
  icone: string;
}

export function classificar(pct: number): Classe {
  if (pct < 10) return { texto: 'Muito baixo', cor: 'var(--critico)', icone: '▼▼' };
  if (pct < 30) return { texto: 'Baixo', cor: 'var(--alerta)', icone: '▼' };
  if (pct <= 70) return { texto: 'Normal', cor: 'var(--bom)', icone: '●' };
  if (pct <= 90) return { texto: 'Alto', cor: 'var(--alerta)', icone: '▲' };
  return { texto: 'Muito alto', cor: 'var(--critico)', icone: '▲▲' };
}

export function frasePercentil(pct: number): string {
  const p = Math.round(pct);
  return p >= 50 ? `mais alto que ${p}% dos dias registrados` : `mais baixo que ${100 - p}% dos dias registrados`;
}

/** Onde a água bate numa pessoa em pé na cota do dia típico (mediana histórica). */
export function frasePessoa(ref: Referencia, cota: number): string {
  const h = cota - ref.mediana_m;
  if (h <= 0) return `a água estaria ${fmt(Math.abs(h))} m abaixo dos seus pés`;
  if (h < 0.3) return 'a água estaria nos seus tornozelos';
  if (h < 0.6) return 'a água estaria nos seus joelhos';
  if (h < 1.0) return 'a água estaria na sua cintura';
  if (h < 1.35) return 'a água estaria no seu peito';
  if (h < ALTURA_PESSOA) return 'a água estaria no seu pescoço';
  return `você estaria submerso, com ${fmt(h - ALTURA_PESSOA)} m de água acima da cabeça`;
}

export function selecaoDoDia(d: Serie, i: number, atalho?: string): Selecao {
  const [data, cota] = d.serie[i];
  return { cota, data, rotulo: dataBR(data), atalho: atalho ?? (i === d.serie.length - 1 ? 'hoje' : null) };
}

export interface Atalho {
  chave: string;
  rotulo: string;
  selecao: Selecao;
}

/** Botões de momento da cena: hoje, 1 ano atrás, recordes e dia típico. */
export function atalhos(d: Serie, ref: Referencia): Atalho[] {
  const lista: Atalho[] = [{ chave: 'hoje', rotulo: 'Hoje', selecao: selecaoDoDia(d, d.serie.length - 1) }];
  const umAnoAtras = `${+d.data_atual.slice(0, 4) - 1}${d.data_atual.slice(4)}`;
  const i = d.serie.findIndex((p) => p[0] >= umAnoAtras);
  if (i > 0) lista.push({ chave: 'ano', rotulo: 'Há 1 ano', selecao: selecaoDoDia(d, i, 'ano') });
  const fixo = (chave: string, rotulo: string, cota: number, data: string): Atalho =>
    ({ chave, rotulo, selecao: { cota, data, rotulo: `${rotulo} (${dataBR(data)})`, atalho: chave } });
  const max = ref.aproximada ? 'Máximo do período' : 'Cheia recorde';
  const min = ref.aproximada ? 'Mínimo do período' : 'Seca recorde';
  lista.push(fixo('max', `${max} ${ref.data_recorde_maximo.slice(0, 4)}`, ref.recorde_maximo_m, ref.data_recorde_maximo));
  lista.push(fixo('tipico', 'Dia típico', ref.mediana_m, d.data_atual));
  lista.push(fixo('min', `${min} ${ref.data_recorde_minimo.slice(0, 4)}`, ref.recorde_minimo_m, ref.data_recorde_minimo));
  return lista;
}
