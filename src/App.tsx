import React, { useState } from 'react';
import { AppTab, ReceivingOrder, PalletSSCC, StockPosition, RuleConfig, AuditLog, ArtsoftStockDivergence } from './types/wms';
import {
  INITIAL_ARTSOFT_DIVERGENCES,
  INITIAL_RULE_CONFIGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_LOCATIONS
} from './data/mockData';
import { Navbar } from './components/Navbar';
import { RececaoModule } from './components/RececaoModule';
import { PaletizacaoModule } from './components/PaletizacaoModule';
import { StockMapModule } from './components/StockMapModule';
import { ArtsoftSyncModule } from './components/ArtsoftSyncModule';
import { RegrasEngineModule } from './components/RegrasEngineModule';
import { AuditoriaModule } from './components/AuditoriaModule';
import { ExpedicaoModule } from './components/ExpedicaoModule';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { useWMSData } from './hooks/useWMSData';
import { useExpedicaoData } from './hooks/useExpedicaoData';
import { PedidoCompra, GuiaTransporte, PaletaExpedicao } from './types/expedicao';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('rececao');
  const [selectedTenant, setSelectedTenant] = useState<string>('TicSol_HuB (Sonae MC)');

  // WMS Main State Collections — Real data from API + fallback to mock
  const { orders, pallets, stock: stockList, loading: wmsLoading, error: wmsError, setOrders, setPallets, setStock: setStockList } = useWMSData();
  const [divergences, setDivergences] = useState<ArtsoftStockDivergence[]>(INITIAL_ARTSOFT_DIVERGENCES);
  const [rules, setRules] = useState<RuleConfig[]>(INITIAL_RULE_CONFIGS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [locations] = useState(INITIAL_LOCATIONS);

  // Expedição State — Real data from API + fallback mock
  const { pedidos: pedidosCompra, paletas: paletasExpedicao, guias: guiasTransporte, loading: expedicaoLoading, error: expedicaoError, setPedidos: setPedidosCompra, setPaletas: setPaletasExpedicao, setGuias: setGuiasTransporte } = useExpedicaoData();

  // Scanner & Navigation Helpers
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [preSelectedOrderAndLine, setPreSelectedOrderAndLine] = useState<{
    orderId: string;
    lineId: string;
  } | null>(null);

  // Handler: Navigate directly from Receção to Paletização
  const handleNavigateToPaletizacao = (guiaId: string, lineId: string) => {
    setPreSelectedOrderAndLine({ orderId: guiaId, lineId });
    setActiveTab('paletizacao');
  };

  // Handler: When a pallet SSCC is created (materialized)
  const handlePalletCreated = (
    newPallet: PalletSSCC, 
    orderId: string, 
    lineId: string, 
    boxesAdded: number
  ) => {
    // 1. Append Pallet to SSCC list
    setPallets(prev => [newPallet, ...prev]);

    // 2. CRITICAL FIX for Pending Item #3: Increment `qtd_ja_paletizada_caixas`
    setOrders(prevOrders =>
      prevOrders.map(ord => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          linhas: ord.linhas.map(line => {
            if (line.id !== lineId) return line;
            const updatedJaPaletizado = line.qtd_ja_paletizada_caixas + boxesAdded;
            return {
              ...line,
              qtd_ja_paletizada_caixas: updatedJaPaletizado
            };
          })
        };
      })
    );

    // 3. Create initial Stock Position in Staging
    const newStockPos: StockPosition = {
      id: `STK-${Date.now()}`,
      localizacao_codigo: 'EM_STAGING',
      zona: 'Cais de Receção',
      sscc: newPallet.sscc,
      artigo_codigo: newPallet.artigo_codigo,
      artigo_descricao: newPallet.artigo_descricao,
      ean_barcode: newPallet.ean_barcode,
      lote: newPallet.lote,
      data_validade: newPallet.data_validade,
      dias_para_validade: 365,
      fefo_status: 'OK',
      qtd_caixas: newPallet.caixas_na_palete,
      qtd_unidades: newPallet.unidades_totais,
      peso_kg: newPallet.peso_bruto_kg,
      empresa_owner: selectedTenant,
      reservado_pedido: false,
      data_entrada: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    setStockList(prev => [newStockPos, ...prev]);

    // 4. Record Audit Log for PostgREST RPC
    const newLog: AuditLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      operador: 'Op. Terminal WMS (ID: 104)',
      empresa_tenant: selectedTenant,
      acao: 'MATERIALIZAR_PALETE_SSCC',
      tabela_afetada: 'logistics.palete_sscc',
      postgrest_rpc: 'fn_criar_palete_sscc(guia_id, artigo, lote, sscc)',
      detalhes_json: JSON.stringify({
        sscc: newPallet.sscc,
        caixas: newPallet.caixas_na_palete,
        lote: newPallet.lote,
        validade: newPallet.data_validade,
        altura_cm: newPallet.altura_total_cm
      }),
      ip_terminal: '192.168.1.105 (Terminal Cais)'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Handler: Relocate Stock Position
  const handleTransferStock = (stockId: string, newLocationCode: string) => {
    setStockList(prev =>
      prev.map(stk => (stk.id === stockId ? { ...stk, localizacao_codigo: newLocationCode } : stk))
    );

    const log: AuditLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      operador: 'Op. Empilhador',
      empresa_tenant: selectedTenant,
      acao: 'REMANEJAMENTO_STOCK',
      tabela_afetada: 'logistics.posicao_stock',
      postgrest_rpc: 'fn_transferir_localizacao(stock_id, loc_nova)',
      detalhes_json: JSON.stringify({ stockId, novaLocalizacao: newLocationCode }),
      ip_terminal: '192.168.1.112 (Terminal RF)'
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  // Handler: Reconcile ARTSOFT Divergence
  const handleResolveDivergence = (artigoCodigo: string) => {
    setDivergences(prev =>
      prev.map(d =>
        d.artigo_codigo === artigoCodigo
          ? {
              ...d,
              stock_artsoft_erp: d.stock_fisico_wms,
              diferenca: 0,
              percentual_divergencia: 0,
              status: 'ALINHADO'
            }
          : d
      )
    );
  };

  // Handler: Trigger Sync ARTSOFT
  const handleTriggerSync = () => {
    setDivergences(prev =>
      prev.map(d => ({
        ...d,
        ultima_reconciliacao: new Date().toISOString().replace('T', ' ').slice(0, 16)
      }))
    );
  };

  // Handler: Create Transport Guide (Expedição)
  const handleCreateGuia = (guia: GuiaTransporte) => {
    setGuiasTransporte(prev => [guia, ...prev]);
    setPedidosCompra(prev =>
      prev.map(p => (p.id === guia.pedido_compra_id ? { ...p, status: 'EXPEDIDO' } : p))
    );
    const log: AuditLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      operador: 'Op. Expedição',
      empresa_tenant: selectedTenant,
      acao: 'GERAR_GUIA_TRANSPORTE',
      tabela_afetada: 'logistics.guia_transporte',
      postgrest_rpc: 'fn_gerar_guia_transporte(pedido_id, paletas)',
      detalhes_json: JSON.stringify({ numero_guia: guia.numero_guia, paletas: guia.paletes_sscc }),
      ip_terminal: '192.168.1.115 (Terminal Expedição)'
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  // Handler: Update Pedido Status
  const handleUpdatePedido = (pedido: PedidoCompra) => {
    setPedidosCompra(prev =>
      prev.map(p => (p.id === pedido.id ? pedido : p))
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      
      {/* Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScannerModal
          onClose={() => setIsScannerOpen(false)}
          onScan={(code) => {
            setScannedCode(code);
            setIsScannerOpen(false);
          }}
        />
      )}

      {/* Primary WMS Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedTenant={selectedTenant}
        setSelectedTenant={setSelectedTenant}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      {/* Status Alert */}
      {wmsError && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <span className="text-sm">⚠️ {wmsError}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* KPI Dashboard Stat Cards Row (Sleek Interface Theme) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Stock em Armazém</div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-slate-900">{stockList.length.toLocaleString('pt-PT')}</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Real-time</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Receções Pendentes</div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-slate-900">{orders.length}</span>
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">{orders.filter(o => o.status === 'PENDENTE').length} Pendentes</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Paletes SSCC Criadas</div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-slate-900">{pallets.length}</span>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">{wmsLoading ? 'Sincronizando...' : 'Atualizado'}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sync Latency (ARTSOFT)</div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-slate-900">42ms</span>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">REST Ativo</span>
            </div>
          </div>
        </div>

        {/* Tab 1: Receção */}
        {activeTab === 'rececao' && (
          <RececaoModule
            orders={orders}
            onUpdateOrders={setOrders}
            onNavigateToPaletizacao={handleNavigateToPaletizacao}
            onOpenScanner={() => setIsScannerOpen(true)}
            scannedCode={scannedCode}
            clearScannedCode={() => setScannedCode(null)}
          />
        )}

        {/* Tab 2: Paletização */}
        {activeTab === 'paletizacao' && (
          <PaletizacaoModule
            orders={orders}
            pallets={pallets}
            ruleConfigs={rules}
            selectedTenant={selectedTenant}
            onPalletCreated={handlePalletCreated}
            preSelectedOrderAndLine={preSelectedOrderAndLine}
          />
        )}

        {/* Tab 3: Stock & Mapa de Armazém */}
        {activeTab === 'stock_mapa' && (
          <StockMapModule
            stockList={stockList}
            locations={locations}
            selectedTenant={selectedTenant}
            onTransferStock={handleTransferStock}
          />
        )}

        {/* Tab 4: Expedição */}
        {activeTab === 'expedicao' && (
          <ExpedicaoModule
            pedidos={pedidosCompra}
            paletas={paletasExpedicao}
            onCreateGuia={handleCreateGuia}
            onUpdatePedido={handleUpdatePedido}
          />
        )}

        {/* Tab 5: Sync ARTSOFT */}
        {activeTab === 'artsoft_sync' && (
          <ArtsoftSyncModule
            divergences={divergences}
            onTriggerSync={handleTriggerSync}
            onResolveDivergence={handleResolveDivergence}
          />
        )}

        {/* Tab 5: Motor de Regras */}
        {activeTab === 'regras' && (
          <RegrasEngineModule
            rules={rules}
            onUpdateRule={(updated) => {
              setRules(prev => prev.map(r => r.cliente_id === updated.cliente_id ? updated : r));
            }}
          />
        )}

        {/* Tab 6: Auditoria */}
        {activeTab === 'auditoria' && (
          <AuditoriaModule logs={auditLogs} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 font-mono shadow-inner">
        <p>TicSol Logistics Hub B2B • WMS v2.4 • Base de Dados: <code className="text-blue-600 font-bold">ticsol_wms</code> (PostgreSQL / PostgREST)</p>
      </footer>
    </div>
  );
}
