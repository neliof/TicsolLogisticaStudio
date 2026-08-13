import React, { useState, useMemo } from 'react';
import { GuiaTransporte, PaletaExpedicao, LinhaGuia } from '../types/expedicao';
import { generateSSCC } from '../utils/gs1';
import { Barcode, Layers, Printer, AlertTriangle, CheckCircle2, Plus, Truck } from 'lucide-react';

interface ExpedicaoPaletizacaoModuleProps {
  guias: GuiaTransporte[];
  onCreatePalete: (palete: PaletaExpedicao) => void;
  onPrintSSCC: (palete: PaletaExpedicao) => void;
}

// Agrupa linhas por temperatura
interface GrupoTemperatura {
  temperatura: 'AMBIENTE' | 'FRESCO' | 'CONGELADO';
  linhas: LinhaGuia[];
  peso_total_kg: number;
  volume_total_m3: number;
}

export const ExpedicaoPaletizacaoModule: React.FC<ExpedicaoPaletizacaoModuleProps> = ({
  guias,
  onCreatePalete,
  onPrintSSCC
}) => {
  const [selectedGuiaId, setSelectedGuiaId] = useState<string>(guias[0]?.id || '');
  const [selectedTemperatura, setSelectedTemperatura] = useState<'AMBIENTE' | 'FRESCO' | 'CONGELADO'>('AMBIENTE');

  const selectedGuia = guias.find(g => g.id === selectedGuiaId) || guias[0];

  // Agrupar linhas por temperatura
  const gruposTemperatura = useMemo(() => {
    if (!selectedGuia) return [];

    const grupos: Record<string, LinhaGuia[]> = {
      AMBIENTE: [],
      FRESCO: [],
      CONGELADO: []
    };

    selectedGuia.linhas.forEach(linha => {
      grupos[linha.temperatura_armazenamento]?.push(linha);
    });

    return Object.entries(grupos)
      .filter(([_, linhas]) => linhas.length > 0)
      .map(([temp, linhas]) => {
        const peso = linhas.reduce((sum, l) => sum + l.quantidade_solicitada * l.peso_unitario_kg, 0);
        const volume = linhas.reduce((sum, l) => sum + l.quantidade_solicitada * l.volume_unitario_m3, 0);
        return {
          temperatura: temp as 'AMBIENTE' | 'FRESCO' | 'CONGELADO',
          linhas,
          peso_total_kg: Math.round(peso * 10) / 10,
          volume_total_m3: Math.round(volume * 1000) / 1000
        };
      });
  }, [selectedGuia]);

  const grupoSelecionado = gruposTemperatura.find(g => g.temperatura === selectedTemperatura);

  const handleCreatePalete = () => {
    if (!grupoSelecionado || !selectedGuia) {
      alert('Seleciona grupo de temperatura com linhas');
      return;
    }

    const ssccObj = generateSSCC();
    const sscc = ssccObj.ssccFull;
    const palete: PaletaExpedicao = {
      id: `pal-${Date.now()}`,
      sscc,
      guia_id: selectedGuia.id,
      linhas_guia: grupoSelecionado.linhas.map(l => l.id),
      produtos: grupoSelecionado.linhas.map(l => ({
        artigo_codigo: l.artigo_codigo,
        artigo_descricao: l.artigo_descricao,
        quantidade: l.quantidade_solicitada,
        lote: l.lote
      })),
      temperatura_zona: selectedTemperatura,
      peso_total_kg: grupoSelecionado.peso_total_kg,
      volume_total_m3: grupoSelecionado.volume_total_m3,
      altura_palete_cm: 140,
      dimensoes_palete_cm: '120x80x140',
      status: 'PREPARANDO',
      data_criacao: new Date().toISOString(),
      operador_criacao: 'Op. Paletização #42'
    };

    onCreatePalete(palete);
    alert(`Palete criada: ${sscc}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <Layers className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Paletização de Expedição</h1>
        </div>
        <p className="text-purple-100">Auto-agrupamento por temperatura + impressão SSCC</p>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Column 1: Selecção Guia */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-4">
          <h2 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Guia de Transporte
          </h2>

          <select
            value={selectedGuiaId}
            onChange={(e) => setSelectedGuiaId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {guias.map(g => (
              <option key={g.id} value={g.id}>
                {g.numero_guia} - {g.cliente_nome}
              </option>
            ))}
          </select>

          {selectedGuia && (
            <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-sm border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-600">Cliente:</span>
                <span className="font-bold text-slate-900">{selectedGuia.cliente_nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Morada:</span>
                <span className="text-xs text-slate-700">{selectedGuia.codigo_postal_entrega}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Entrega:</span>
                <span className="text-slate-900">{selectedGuia.data_entrega_prevista}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between">
                <span className="text-slate-600">Linhas:</span>
                <span className="font-bold text-purple-600">{selectedGuia.linhas.length} produtos</span>
              </div>
            </div>
          )}

          {/* Seleção Temperatura */}
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">Zona Térmica</label>
            <div className="space-y-2">
              {gruposTemperatura.map(grupo => (
                <button
                  key={grupo.temperatura}
                  onClick={() => setSelectedTemperatura(grupo.temperatura)}
                  className={`w-full p-3 rounded-lg text-sm font-semibold transition-all text-left flex items-center justify-between ${
                    selectedTemperatura === grupo.temperatura
                      ? 'bg-purple-600 text-white border-2 border-purple-700'
                      : 'bg-slate-100 text-slate-900 border-2 border-transparent hover:bg-slate-200'
                  }`}
                >
                  <span>{grupo.temperatura}</span>
                  <span className="text-xs opacity-75">{grupo.linhas.length} prod</span>
                </button>
              ))}
            </div>
          </div>

          {grupoSelecionado && (
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 space-y-2 text-sm">
              <div className="font-bold text-purple-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {grupoSelecionado.temperatura}
              </div>
              <div className="text-purple-700 text-xs">
                {grupoSelecionado.linhas.length} produto(s)  |  {grupoSelecionado.peso_total_kg}kg  |  {grupoSelecionado.volume_total_m3}m³
              </div>
            </div>
          )}
        </div>

        {/* Column 2: Detalhes Grupo + Criar Palete */}
        {grupoSelecionado && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-4">
            <h2 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <Barcode className="w-4 h-4" />
              Produtos ({grupoSelecionado.linhas.length})
            </h2>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {grupoSelecionado.linhas.map(linha => (
                <div key={linha.id} className="bg-slate-50 p-2 rounded border border-slate-200 text-xs">
                  <div className="font-mono font-bold text-slate-900">{linha.artigo_codigo}</div>
                  <div className="text-slate-600 text-[11px] truncate">{linha.artigo_descricao}</div>
                  <div className="flex justify-between mt-1 text-slate-500 text-[11px]">
                    <span>{linha.quantidade_solicitada} un × {linha.peso_unitario_kg}kg</span>
                    <span>{Math.round(linha.quantidade_solicitada * linha.peso_unitario_kg * 10) / 10}kg</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Estimativas Palete */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-sm">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Peso Total:</span>
                <span className="text-purple-600">{grupoSelecionado.peso_total_kg} kg</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Volume:</span>
                <span>{grupoSelecionado.volume_total_m3} m³</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Altura est.:</span>
                <span>140 cm</span>
              </div>
            </div>

            {/* Criar Palete Button */}
            <button
              onClick={handleCreatePalete}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-md"
            >
              <Plus className="w-5 h-5" />
              Criar Palete + SSCC
            </button>

            {/* Info Imefar Transport */}
            <div className="bg-blue-50 p-2 rounded border border-blue-200 text-xs text-blue-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Transporte:</strong> Imefar - Veículo Próprio
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-sm text-amber-800">
        <div className="flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-600" />
          <div>
            <strong>Fluxo Paletização Expedição:</strong>
            <ol className="list-decimal list-inside mt-1 space-y-1 text-xs text-amber-700">
              <li>Seleciona Guia de Transporte</li>
              <li>Agrupa automaticamente por temperatura</li>
              <li>Cria Palete + gera SSCC GS1</li>
              <li>Imprime etiqueta (A5 105x148mm)</li>
              <li>Embarque via veículos Imefar</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
