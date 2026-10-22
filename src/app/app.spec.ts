import { describe, expect, it } from 'vitest';
import { classificar, frasePessoa, percentil } from './nivel';
import { Referencia } from './rios.models';

const ref: Referencia = {
  periodo: { inicio: '1902-09-15', fim: '2026-10-22' },
  completo: true,
  recorde_maximo_m: 30.02,
  data_recorde_maximo: '2021-06-16',
  recorde_minimo_m: 12.14,
  data_recorde_minimo: '2024-11-01',
  mediana_m: 23.77,
  percentis_m: Array.from({ length: 21 }, (_, i) => 10 + i), // 10, 11, …, 30
  mediana_por_mes_m: Array(12).fill(20),
};

describe('nivel', () => {
  it('interpola o percentil e satura nas pontas', () => {
    expect(percentil(ref, 5)).toBe(0);
    expect(percentil(ref, 20)).toBe(50);
    expect(percentil(ref, 20.5)).toBeCloseTo(52.5);
    expect(percentil(ref, 99)).toBe(100);
  });

  it('classifica pelos extremos da história', () => {
    expect(classificar(5).texto).toBe('Muito baixo');
    expect(classificar(50).texto).toBe('Normal');
    expect(classificar(95).texto).toBe('Muito alto');
  });

  it('descreve onde a água bate na pessoa em pé na mediana', () => {
    expect(frasePessoa(ref, 16.89)).toBe('a água estaria 6,88 m abaixo dos seus pés');
    expect(frasePessoa(ref, 24.5)).toBe('a água estaria na sua cintura');
    expect(frasePessoa(ref, 30.02)).toBe('você estaria submerso, com 4,55 m de água acima da cabeça');
  });
});
