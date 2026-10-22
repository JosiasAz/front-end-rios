import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Estacao, Referencia, Serie } from './rios.models';

/** API do servidor de rios (proxy do ng serve: /api -> http://127.0.0.1:8000). */
@Injectable({ providedIn: 'root' })
export class RiosService {
  private readonly http = inject(HttpClient);

  estacoes() {
    return this.http.get<Estacao[]>('/api/estacoes');
  }

  serie(estacao: string, anos: number) {
    return this.http.get<Serie>('/api/serie', { params: { estacao, anos } });
  }

  referencia(estacao: string) {
    return this.http.get<Referencia>('/api/referencia', { params: { estacao } });
  }
}
