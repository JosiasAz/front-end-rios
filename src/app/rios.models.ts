/** Formatos devolvidos pela API do servidor_rios.py (cotas em metros, datas AAAA-MM-DD). */

export interface Estacao {
  estacao: string;
  rio: string;
  cidade: string;
  uf: string;
  codigo: string;
}

/** [dia, mediana, mínimo, máximo] */
export type Ponto = [string, number, number, number];

export interface MesResumo {
  mes: string;
  media_m: number;
  min_m: number;
  max_m: number;
}

export interface Serie {
  estacao: string;
  rio: string;
  cidade: string;
  uf: string;
  codigo_ana: string;
  periodo: { inicio: string; fim: string; dias_com_dados: number };
  atual_m: number;
  data_atual: string;
  maximo_m: number;
  data_maximo: string;
  minimo_m: number;
  data_minimo: string;
  media_m: number;
  ha_1_ano_m: number | null;
  diferenca_1_ano_m: number | null;
  tendencia_15d: string;
  variacao_15d_m: number;
  resumo_mensal: MesResumo[];
  meses_sem_dados: string[];
  meses_ainda_baixando: string[];
  atualizando: string[];
  serie: Ponto[];
}

export interface Referencia {
  /** true quando calculada só com o período carregado (histórico ainda baixando). */
  aproximada?: boolean;
  periodo: { inicio: string; fim: string };
  completo: boolean;
  recorde_maximo_m: number;
  data_recorde_maximo: string;
  recorde_minimo_m: number;
  data_recorde_minimo: string;
  mediana_m: number;
  /** Percentis de 0 a 100, de 5 em 5. */
  percentis_m: number[];
  /** Mediana de cada mês do ano (jan..dez): o "normal para a época". */
  mediana_por_mes_m: (number | null)[];
}

/** Momento mostrado na cena do rio. */
export interface Selecao {
  cota: number;
  data: string;
  rotulo: string;
  atalho: string | null;
}
