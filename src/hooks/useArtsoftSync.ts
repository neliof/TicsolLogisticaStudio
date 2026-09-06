import { useCallback, useEffect, useState } from 'react';
import { api, empresaIdDaSessao, ExecucaoSync, LinhaReconciliacao, ResultadoSync, SyncHealth } from '../api';

export function useArtsoftSync() {
  const [execucoes, setExecucoes] = useState<ExecucaoSync[]>([]);
  const [health, setHealth] = useState<SyncHealth | null>(null);
  const [reconciliacao, setReconciliacao] = useState<LinhaReconciliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aSincronizar, setASincronizar] = useState(false);
  const [aSincronizarStock, setASincronizarStock] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState<ResultadoSync | null>(null);

  const carregar = useCallback(async () => {
    const empresaId = empresaIdDaSessao();
    try {
      const [execs, saude, recon] = await Promise.all([
        api.listarExecucoes(20),
        empresaId ? api.healthSync(empresaId) : Promise.resolve(null),
        api.reconciliacaoStock(500).catch(() => [] as LinhaReconciliacao[]),
      ]);
      setExecucoes(execs);
      setHealth(saude);
      setReconciliacao(recon);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao ler o estado da sincronização.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, 30000);
    return () => clearInterval(intervalo);
  }, [carregar]);

  const sincronizar = useCallback(async () => {
    setASincronizar(true);
    setError(null);
    try {
      const resultado = await api.sincronizarGuias();
      setUltimoResultado(resultado);
      await carregar();
      return resultado;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A sincronização falhou.');
      return null;
    } finally {
      setASincronizar(false);
    }
  }, [carregar]);

  const sincronizarStock = useCallback(async () => {
    setASincronizarStock(true);
    setError(null);
    try {
      await api.sincronizarStock();
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A sincronização de stock falhou.');
    } finally {
      setASincronizarStock(false);
    }
  }, [carregar]);

  return {
    execucoes,
    health,
    reconciliacao,
    loading,
    error,
    aSincronizar,
    aSincronizarStock,
    ultimoResultado,
    sincronizar,
    sincronizarStock,
    recarregar: carregar,
  };
}
