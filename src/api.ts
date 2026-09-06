/**
 * Cliente da API do TicSol Logistics Hub.
 *
 * O token de sessão fica em sessionStorage: dura enquanto o separador estiver
 * aberto e não sobrevive ao fecho do browser.
 */

const CHAVE_TOKEN = 'ticsol.token';
const CHAVE_UTILIZADOR = 'ticsol.utilizador';

export interface Utilizador {
  id: string;
  nome: string;
  email: string;
}

export interface Sessao {
  token: string;
  utilizador: Utilizador;
}

export interface ExecucaoSync {
  id: string;
  empresa_id: string;
  tipo: string;
  correlation_id: string | null;
  estado: 'ok' | 'erro_comunicacao' | 'erro_autenticacao' | 'erro_xml' | 'erro_funcional' | 'incompleto';
  pagina: number | null;
  registos: number | null;
  registos_novos: number | null;
  duracao_ms: number | null;
  erro_resumo: string | null;
  executado_em: string;
}

export interface SyncHealth {
  healthy: boolean;
  lastSync: string | null;
  estado: string;
  diasDesdeUltimaSincronizacao: number | null;
}

export interface LinhaReconciliacao {
  produto_id: string;
  sku_interno: string;
  descricao: string;
  quantidade_wms: string | number;
  quantidade_artsoft: string | number | null;
  ultima_sincronizacao: string | null;
  conector_usado: string | null;
  diferenca: string | number | null;
}

export interface ResultadoSync {
  docs_criados: number;
  docs_atualizados: number;
  linhas_total: number;
  erros: unknown[];
  ultima_execucao: { estado: string; correlation_id: string; paginas: number };
}

export function guardarSessao(token: string, utilizador: Utilizador): void {
  sessionStorage.setItem(CHAVE_TOKEN, token);
  sessionStorage.setItem(CHAVE_UTILIZADOR, JSON.stringify(utilizador));
}

export function lerSessao(): Sessao | null {
  const token = sessionStorage.getItem(CHAVE_TOKEN);
  if (!token) return null;
  try {
    return { token, utilizador: JSON.parse(sessionStorage.getItem(CHAVE_UTILIZADOR) || '{}') };
  } catch {
    return { token, utilizador: {} as Utilizador };
  }
}

export function terminarSessao(): void {
  sessionStorage.removeItem(CHAVE_TOKEN);
  sessionStorage.removeItem(CHAVE_UTILIZADOR);
}

/**
 * Lê o empresa_id do payload do JWT. Serve apenas para compor pedidos de
 * leitura; quem valida o token e aplica RLS é sempre o servidor.
 */
export function empresaIdDaSessao(): string | null {
  const sessao = lerSessao();
  if (!sessao) return null;
  try {
    const payload = sessao.token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json).empresa_id ?? null;
  } catch {
    return null;
  }
}

export class SessaoExpirada extends Error {}

async function pedir<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const sessao = lerSessao();
  const res = await fetch(caminho, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      ...(sessao ? { Authorization: `Bearer ${sessao.token}` } : {}),
      ...(opcoes.headers || {}),
    },
  });

  if (res.status === 401) {
    terminarSessao();
    throw new SessaoExpirada('Sessão expirada. Volte a entrar.');
  }

  const texto = await res.text();
  let corpo: any = null;
  try {
    corpo = texto ? JSON.parse(texto) : null;
  } catch {
    corpo = texto;
  }

  if (!res.ok) {
    throw new Error((corpo && (corpo.error || corpo.message)) || `Erro ${res.status}`);
  }

  return corpo as T;
}

export const api = {
  async entrar(email: string, password: string): Promise<Utilizador> {
    const r = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(
        r.status === 429
          ? 'Demasiadas tentativas. Aguarde alguns minutos.'
          : corpo.error || 'Credenciais inválidas.'
      );
    }
    guardarSessao(corpo.token, corpo.usuario);
    return corpo.usuario;
  },

  listarDocumentos(limite = 100) {
    return pedir<any[]>(`/rest/v1/documento?limit=${limite}`);
  },

  listarLinhasDoDocumento(documentoId: string) {
    return pedir<any[]>(`/rest/v1/documento/${documentoId}/linhas`);
  },

  listarExecucoes(limite = 20) {
    return pedir<ExecucaoSync[]>(`/rest/v1/sincronizacao_execucao?limit=${limite}`);
  },

  sincronizarGuias() {
    return pedir<ResultadoSync>('/api/artsoft/guias/sync', { method: 'POST' });
  },

  healthSync(empresaId: string) {
    return pedir<SyncHealth>(`/health/sync/${empresaId}`);
  },

  reconciliacaoStock(limite = 500) {
    return pedir<LinhaReconciliacao[]>(`/rest/v1/vw_reconciliacao_stock?limit=${limite}`);
  },

  sincronizarStock() {
    return pedir<{ gravados: number; nao_resolvidos: number; produtos: number }>(
      '/api/artsoft/stock/sync',
      { method: 'POST' }
    );
  },
};
