import React, { useState } from 'react';
import { PedidoCompra, GuiaTransporte, PaletaExpedicao } from '../types/expedicao';
import {
  Package,
  Truck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  Thermometer,
  Plus,
  FileDown,
  Send
} from 'lucide-react';

interface ExpedicaoModuleProps {
  pedidos: PedidoCompra[];
  paletas: PaletaExpedicao[];
  onCreateGuia: (guia: GuiaTransporte) => void;
  onUpdatePedido: (pedido: PedidoCompra) => void;
}

export const ExpedicaoModule: React.FC<ExpedicaoModuleProps> = ({
  pedidos,
  paletas,
  onCreateGuia,
  onUpdatePedido
}) => {
  const [selectedPedidoId, setSelectedPedidoId] = useState<string>(pedidos[0]?.id || '');
  const [showGuiaForm, setShowGuiaForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');

  const selectedPedido = pedidos.find(p => p.id === selectedPedidoId) || pedidos[0];
  const pedidoPaletas = selectedPedido ? paletas.filter(p => p.pedido_id === selectedPedido.id) : [];
  const pesoTotal = pedidoPaletas.reduce((sum, p) => sum + p.peso_bruto_kg, 0);

  const handleCreateGuia = () => {
    if (!selectedPedido || pedidoPaletas.length === 0) {
      alert('Seleciona pedido com paletas preparadas');
      return;
    }

    const guia: GuiaTransporte = {
      id: `GT-${Date.now()}`,
      numero_guia: `GT-${selectedPedido.numero}-${new Date().toISOString().slice(0, 10)}`,
      data_emissao: new Date().toISOString().slice(0, 10),
      pedido_compra_id: selectedPedido.id,
      paletes_sscc: pedidoPaletas.map(p => p.sscc),
      peso_total_kg: pesoTotal,
      volume_m3: (pesoTotal / 1000) * 1.2, // estimativa simplista
      transportador_nome: 'DHL (provisório)',
      transportador_veiculo: 'MB Sprinter Frigorífico',
      motorista_nome: 'João Silva',
      data_saida_prevista: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10),
      observacoes: `Pedido ${selectedPedido.numero} - Imefar para Sonae`,
      status: 'PRONTA_EMBARQUE'
    };

    onCreateGuia(guia);
    setShowGuiaForm(false);
  };

  const filteredPedidos = statusFilter === 'TODOS'
    ? pedidos
    : pedidos.filter(p => p.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Truck className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Expedição</h2>
            <p className="text-sm text-slate-600">Encomendas Sonae MC → Imefar (ARTSOFT)</p>
          </div>
        </div>
        <button
          onClick={() => setShowGuiaForm(!showGuiaForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Gerar Guia Transporte
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {['TODOS', 'PENDENTE', 'CONFIRMADO', 'PREPARANDO', 'PRONTO', 'EXPEDIDO'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Pedidos List */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
              Pedidos Compra ({filteredPedidos.length})
            </div>
            <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
              {filteredPedidos.map(pedido => (
                <button
                  key={pedido.id}
                  onClick={() => setSelectedPedidoId(pedido.id)}
                  className={`w-full text-left p-4 hover:bg-blue-50 transition border-l-4 ${
                    selectedPedido?.id === pedido.id ? 'border-blue-600 bg-blue-50' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{pedido.numero}</div>
                      <div className="text-sm text-slate-600">{pedido.cliente_nome} → {pedido.fornecedor_nome}</div>
                      <div className="text-xs text-slate-500 mt-1">{pedido.linhas.length} linhas • {pedido.data_pedido}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      pedido.status === 'EXPEDIDO' ? 'bg-green-100 text-green-700' :
                      pedido.status === 'PRONTO' ? 'bg-blue-100 text-blue-700' :
                      pedido.status === 'PREPARANDO' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {pedido.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pedido Details */}
        {selectedPedido && (
          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Pedido {selectedPedido.numero}</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Cliente:</span>
                  <span className="font-medium">{selectedPedido.cliente_nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Fornecedor:</span>
                  <span className="font-medium">{selectedPedido.fornecedor_nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Entrega:</span>
                  <span className="font-medium">{selectedPedido.data_entrega_prevista}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">ARTSOFT ID:</span>
                  <span className="font-mono text-xs">{selectedPedido.artsoft_order_id}</span>
                </div>
              </div>
            </div>

            {/* Paletas Info */}
            <div className="border-t border-slate-200 pt-4">
              <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Paletas ({pedidoPaletas.length})
              </h4>
              <div className="space-y-2">
                {pedidoPaletas.map(p => (
                  <div key={p.id} className="text-xs bg-slate-50 p-2 rounded">
                    <div className="font-mono font-semibold">{p.sscc}</div>
                    <div className="text-slate-600">{p.peso_bruto_kg}kg • {p.altura_cm}cm altura</div>
                    <div className="text-slate-500 flex items-center gap-1 mt-1">
                      <Thermometer className="w-3 h-3" />
                      {p.temperatura_requerida}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="border-t border-slate-200 pt-4 bg-blue-50 p-3 rounded">
              <div className="flex justify-between font-semibold text-slate-900">
                <span>Peso Total:</span>
                <span>{pesoTotal}kg</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Guia Transporte Form */}
      {showGuiaForm && selectedPedido && pedidoPaletas.length > 0 && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-900">Nova Guia de Transporte</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Transportador</label>
              <input
                type="text"
                defaultValue="DHL"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Nome transportador"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Veículo</label>
              <input
                type="text"
                defaultValue="MB Sprinter Frigorífico"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Identificação veículo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Motorista</label>
              <input
                type="text"
                defaultValue="João Silva"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Nome motorista"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data Saída</label>
              <input
                type="date"
                defaultValue={new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
            <textarea
              defaultValue={`Pedido ${selectedPedido.numero} - Imefar para Sonae`}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              rows={2}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreateGuia}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              <Send className="w-4 h-4" />
              Gerar e Expedir
            </button>
            <button
              onClick={() => setShowGuiaForm(false)}
              className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
            >
              Cancelar
            </button>
          </div>

          {/* Checklist */}
          <div className="mt-6 border-t border-green-300 pt-4">
            <h4 className="font-semibold text-slate-900 mb-3">Checklist Pré-Expedição</h4>
            <div className="space-y-2">
              {[
                'Todas linhas preparadas e paletizadas',
                'Paletas com SSCC válidos',
                'Documentação completa (ARTSOFT)',
                'Temperatura de transporte confirmada',
                'Veículo frigorífico disponível',
                'Peso/volume dentro limites'
              ].map(item => (
                <label key={item} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded" defaultChecked />
                  <span className="text-sm text-slate-700">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
