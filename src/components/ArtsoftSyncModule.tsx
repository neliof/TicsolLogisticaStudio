import React, { useState } from 'react';
import { ArtsoftStockDivergence } from '../types/wms';
import { 
  RefreshCw, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  ArrowUpRight, 
  Play, 
  Search,
  ShieldAlert,
  Server
} from 'lucide-react';

interface ArtsoftSyncModuleProps {
  divergences: ArtsoftStockDivergence[];
  onTriggerSync: () => void;
  onResolveDivergence: (artigoCodigo: string) => void;
}

export const ArtsoftSyncModule: React.FC<ArtsoftSyncModuleProps> = ({
  divergences,
  onTriggerSync,
  onResolveDivergence
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncLogs, setSyncLogs] = useState<string[]>([
    '10:40:01 [ARTSOFT Connector] Conectado ao endpoint local 192.168.1.28:4218',
    '10:40:02 [PostgREST] Tabela logistics.artsoft_stock_snapshot sincronizada com sucesso.',
    '10:40:03 [WMS Engine] Vista vw_reconciliacao_stock calculou 1 divergência crítica.'
  ]);

  const handleRunSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      onTriggerSync();
      setIsSyncing(false);
      setSyncLogs(prev => [
        `${new Date().toLocaleTimeString()} [ARTSOFT Sync] Sincronização executada via REST 192.168.1.28:4218. Snapshot de stock atualizado!`,
        ...prev
      ]);
    }, 1800);
  };

  const filteredDivergences = divergences.filter(d => 
    d.artigo_descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.artigo_codigo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Module Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-blue-600" />
            Serviço de Sync ARTSOFT ERP & Reconciliação de Stock
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Comparação da vista <code className="text-blue-600 font-mono font-bold">vw_reconciliacao_stock</code> com <code className="text-blue-600 font-mono font-bold">artsoft_stock_snapshot</code>.
          </p>
        </div>

        <button
          onClick={handleRunSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          <Play className={`w-4 h-4 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Sincronizando...' : 'Forçar Sync ARTSOFT agora'}</span>
        </button>
      </div>

      {/* Connection & Staging Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Status Card 1: Connector */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm font-mono text-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span>Conector Local</span>
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
          </div>
          <p className="font-bold text-slate-900 text-sm font-sans">ARTSOFT REST Connector</p>
          <p className="text-blue-700 font-bold">Endpoint: 192.168.1.28:4218</p>
          <p className="text-[11px] text-slate-500">Conexão HTTP Ativa (Pervasive / ARTSOFT Local)</p>
        </div>

        {/* Status Card 2: Safe Staging Isolation */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm font-mono text-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span>Regra de Segurança WMS</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-bold text-slate-900 text-sm font-sans">Isolamento Físico de Stock</p>
          <p className="text-slate-700">O ERP ARTSOFT nunca altera o stock físico diretamente.</p>
          <p className="text-[11px] text-emerald-700 font-semibold">Vista vw_reconciliacao_stock em execução.</p>
        </div>

        {/* Status Card 3: Divergence Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm font-mono text-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span>Reconciliação Humana</span>
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <p className="font-bold text-slate-900 text-sm font-sans">Pendentes de Revisão</p>
          <p className="text-rose-600 font-bold text-sm">
            {divergences.filter(d => d.status === 'CRITICO').length} Discrepância(s) Crítica(s)
          </p>
          <p className="text-[11px] text-slate-500">Alinhamento requerido pelo responsável de armazém.</p>
        </div>
      </div>

      {/* Reconciliation Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600" />
            Tabela de Reconciliação (ARTSOFT ERP vs. Stock Físico WMS)
          </h3>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar artigo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px] bg-slate-50">
                <th className="p-3">Artigo</th>
                <th className="p-3">Stock ARTSOFT (ERP)</th>
                <th className="p-3">Stock Físico (WMS)</th>
                <th className="p-3">Staging Pending</th>
                <th className="p-3">Diferença (Un)</th>
                <th className="p-3">Estado Reconciliação</th>
                <th className="p-3 text-right">Ação Humana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredDivergences.map(div => {
                const isCrit = div.status === 'CRITICO';
                return (
                  <tr key={div.artigo_codigo} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <span className="font-bold text-slate-900 font-sans block">{div.artigo_descricao}</span>
                      <span className="text-slate-500 text-[11px]">{div.artigo_codigo}</span>
                    </td>
                    <td className="p-3 font-bold text-slate-700">{div.stock_artsoft_erp} Un</td>
                    <td className="p-3 font-bold text-blue-600">{div.stock_fisico_wms} Un</td>
                    <td className="p-3 text-slate-500">{div.stock_staging_artsoft} Un</td>
                    <td className={`p-3 font-bold ${div.diferenca !== 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {div.diferenca > 0 ? `+${div.diferenca}` : div.diferenca} Un
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          isCrit
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : div.status === 'DIVERGENCIA_MENOR'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {div.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {div.status !== 'ALINHADO' ? (
                        <button
                          onClick={() => onResolveDivergence(div.artigo_codigo)}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] rounded transition-colors shadow-xs cursor-pointer"
                        >
                          Reconciliar
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-bold text-[11px] flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Alinhado
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sync Console Logs */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-2">
        <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">
          Consola do Serviço de Sincronização em Tempo Real
        </span>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {syncLogs.map((log, idx) => (
            <div key={idx} className="text-slate-400">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
