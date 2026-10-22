import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Cena } from './cena/cena';
import { Grafico } from './grafico/grafico';
import { MESES, atalhos, fmt, refDoPeriodo, selecaoDoDia } from './nivel';
import { Estacao, Referencia, Selecao, Serie } from './rios.models';
import { RiosService } from './rios.service';
import { Resumo } from './resumo/resumo';

@Component({
  selector: 'app-root',
  imports: [Resumo, Grafico, Cena],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly api = inject(RiosService);
  private readonly params = new URLSearchParams(location.search);
  private pedido = 0;

  protected readonly periodos = [1, 2, 3, 5];
  protected readonly estacoes = signal<Estacao[]>([]);
  protected readonly estacao = signal(this.params.get('estacao') ?? 'manaus');
  protected readonly anos = signal(Number(this.params.get('anos')) || 3);
  protected readonly dados = signal<Serie | null>(null);
  protected readonly referencia = signal<Referencia | null>(null);
  protected readonly selecao = signal<Selecao | null>(null);
  protected readonly carregando = signal(false);
  protected readonly aviso = signal('');

  protected readonly tabela = computed(() =>
    (this.dados()?.resumo_mensal ?? []).map((r) => {
      const [a, m] = r.mes.split('-');
      return { mes: `${MESES[+m - 1]}/${a}`, media: fmt(r.media_m), min: fmt(r.min_m), max: fmt(r.max_m) };
    }),
  );

  protected readonly fonte = computed(() => {
    const d = this.dados();
    if (!d) return '';
    const atualizando = d.atualizando.length ? ` · atualizando agora: ${d.atualizando.join(', ')}` : '';
    return `Fonte: telemetria da ANA, estação ${d.codigo_ana}. ${d.periodo.dias_com_dados} dias com dados no período${atualizando}.`;
  });

  constructor() {
    firstValueFrom(this.api.estacoes())
      .then((e) => this.estacoes.set(e))
      .catch(() => { /* carregar() mostra o erro */ });
    this.carregar();
  }

  protected mudarEstacao(ev: Event) {
    this.estacao.set((ev.target as HTMLSelectElement).value);
    this.carregar();
  }

  protected mudarAnos(anos: number) {
    this.anos.set(anos);
    this.carregar();
  }

  protected escolherDia(i: number) {
    this.selecao.set(selecaoDoDia(this.dados()!, i));
  }

  private async carregar() {
    const n = ++this.pedido;
    const estacao = this.estacao();
    const anos = this.anos();
    this.carregando.set(true);
    this.aviso.set(this.dados() ? '' : 'Carregando dados da ANA…');
    history.replaceState(null, '', `?estacao=${encodeURIComponent(estacao)}&anos=${anos}`);
    try {
      const [dados, ref] = await Promise.all([
        firstValueFrom(this.api.serie(estacao, anos)),
        firstValueFrom(this.api.referencia(estacao)).catch(() => null),
      ]);
      if (n !== this.pedido) return;
      const referencia = ref ?? refDoPeriodo(dados);
      // ?momento=hoje|ano|max|tipico|min escolhe o momento da cena na primeira carga.
      const momento = this.params.get('momento');
      this.params.delete('momento');
      const atalho = atalhos(dados, referencia).find((a) => a.chave === momento);
      this.dados.set(dados);
      this.referencia.set(referencia);
      this.selecao.set(atalho?.selecao ?? selecaoDoDia(dados, dados.serie.length - 1));

      const avisos = [];
      if (!ref) avisos.push('O histórico completo ainda está sendo baixado: as comparações usam só o período escolhido.');
      else if (!ref.completo) avisos.push('Parte do histórico ainda está baixando; recordes e percentis podem mudar um pouco.');
      if (dados.meses_ainda_baixando.length) avisos.push(`Meses ainda baixando: ${dados.meses_ainda_baixando.join(', ')}.`);
      this.aviso.set(avisos.join(' '));
    } catch (erro) {
      if (n !== this.pedido) return;
      const http = erro instanceof HttpErrorResponse ? erro : null;
      this.aviso.set(
        http?.status === 0 || (http && http.status >= 502 && http.status <= 504 && !http.error?.detail)
          ? 'Não consegui falar com o servidor de rios. Ele está rodando na porta 8000?'
          : `Não consegui carregar: ${http?.error?.detail ?? (erro as Error).message}`,
      );
    } finally {
      if (n === this.pedido) this.carregando.set(false);
    }
  }
}
