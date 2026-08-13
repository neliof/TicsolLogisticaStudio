import React, { useState } from 'react';
import { GuiaTransporte, PaletaExpedicao, LinhaGuia } from '../types/expedicao';
import { PalletSSCC, RuleConfig } from '../types/wms';
import { generateSSCC, buildGS1128String, formatToGS1Date } from '../utils/gs1';
import { GS1LabelPrintModal } from './GS1LabelPrintModal';
import {
  Boxes,
  Layers,
  Tag,
  Scale,
  Ruler,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ShieldCheck,
  Plus,
  Sparkles,
  ArrowRight,
  Truck
} from 'lucide-react';

interface ExpedicaoPaletizacaoModuleProps {
  guias: GuiaTransporte[];
  ruleConfigs: RuleConfig[];
  selectedTenant: string;
  onPalletCreated: (pallet: PaletaExpedicao, guiaId: string, linhaId: string, qtdAdicionada: number) => void;
}

export const ExpedicaoPaletizacaoModule: React.FC<ExpedicaoPaletizacaoModuleProps> = ({
  guias,
  ruleConfigs,
  selectedTenant,
  onPalletCreated
}) => {
  // Select Guia e Linha
  const [selectedGuiaId, setSelectedGuiaId] = useState<string>(guias[0]?.id || '');
  const selectedGuia = guias.find(g => g.id === selectedGuiaId) || guias[0];

  const [selectedLinhaId, setSelectedLinhaId] = useState<string>(selectedGuia?.linhas[0]?.id || '');
  const activeLinha = selectedGuia?.linhas.find(l => l.id === selectedLinhaId) || selectedGuia?.linhas[0];

  // Rule: Sonae MC caderno de encargos
  const activeRule = ruleConfigs.find(r => r.cliente_id === 'SONAE_MC') || ruleConfigs[0];

  // Paletização inputs
  const [caixasPorCamada, setCaixasPorCamada] = useState<number>(10);
  const [numCamadas, setNumCamadas] = useState<number>(4);
  const [activePrintPallet, setActivePrintPallet] = useState<PalletSSCC | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Cálculos
  const caixasSolicitadas = activeLinha ? activeLinha.quantidade_solicitada : 0;
  const caixasNaPaleteProposta = caixasPorCamada * numCamadas;
  const pesoUnitario = activeLinha?.peso_unitario_kg || 0.5;
  const alturaPaleteCm = (pesoUnitario > 0 ? (numCamadas * 25) : 110) + 14; // 14cm Euro-pallet
  const pesoLiquidoKg = Math.round(caixasNaPaleteProposta * pesoUnitario * 0.9 * 10) / 10;
  const pesoBrutoKg = Math.round((caixasNaPaleteProposta * pesoUnitario + 22) * 10) / 10;

  const excedeAltura = alturaPaleteCm > activeRule.altura_maxima_cm;
  const excedePeso = pesoBrutoKg > activeRule.peso_maximo_kg;
  const excedeQuantidade = caixasNaPaleteProposta > caixasSolicitadas;

  const handleMaterializePallet = () => {
    if (!activeLinha || !selectedGuia) return;
    if (excedeQuantidade) {
      alert(`Erro: Palete requer ${caixasNaPaleteProposta} caixas mas guia tem só ${caixasSolicitadas}!`);
      return;
    }

    // Gerar SSCC
    const { ssccFull } = generateSSCC(3, '5601234');
    const validadeGS1 = formatToGS1Date(activeLinha.data_validade || '2027-12-31');
    const gs1128Str = buildGS1128String({
      sscc: ssccFull,
      gtinEan: activeLinha.ean_barcode,
      lote: activeLinha.lote || 'LOTE-STD',
      validadeYYMMDD: validadeGS1,
      qtdCaixas: caixasNaPaleteProposta
    });

    // Criar palete para impressão
    const newPallet: PalletSSCC = {
      sscc: ssccFull,
      guia_id: selectedGuia.id,
      artigo_codigo: activeLinha.artigo_codigo,
      artigo_descricao: activeLinha.artigo_descricao,
      ean_barcode: activeLinha.ean_barcode,
      lote: activeLinha.lote || 'LOTE-PADRAO',
      data_validade: activeLinha.data_validade || '2027-12-31',
      caixas_na_palete: caixasNaPaleteProposta,
      unidades_totais: caixasNaPaleteProposta * 10,
      camadas: numCamadas,
      caixas_por_camada: caixasPorCamada,
      altura_total_cm: alturaPaleteCm,
      peso_liquido_kg: pesoLiquidoKg,
      peso_bruto_kg: pesoBrutoKg,
      regrac_cliente_aplicada: 'SONAE_MC',
      empresa_owner: selectedGuia.cliente_nome,
      localizacao_atual: 'EM_STAGING',
      estado_palete: 'EM_STAGING',
      data_criacao: new Date().toISOString().replace('T', ' ').slice(0, 19),
      operador: 'Op. Paletização Expedição',
      gs1_128_barcode_string: gs1128Str
    };

    // Criar palete expedição
    const paletaExpedicao: PaletaExpedicao = {
      id: `pal-${Date.now()}`,
      sscc: ssccFull,
      guia_id: selectedGuia.id,
      linhas_guia: [activeLinha.id],
      produtos: [{
        artigo_codigo: activeLinha.artigo_codigo,
        artigo_descricao: activeLinha.artigo_descricao,
        quantidade: caixasNaPaleteProposta,
        lote: activeLinha.lote
      }],
      temperatura_zona: activeLinha.temperatura_armazenamento,
      peso_total_kg: pesoBrutoKg,
      volume_total_m3: caixasNaPaleteProposta * activeLinha.volume_unitario_m3,
      altura_palete_cm: alturaPaleteCm,
      dimensoes_palete_cm: `120x80x${alturaPaleteCm}`,
      status: 'PREPARANDO',
      data_criacao: new Date().toISOString(),
      operador_criacao: 'Op. Paletização Expedição'
    };

    onPalletCreated(paletaExpedicao, selectedGuia.id, activeLinha.id, caixasNaPaleteProposta);

    setToastMsg(`Palete SSCC ${ssccFull} criada e materializada! (Expedição)`);
    setTimeout(() => setToastMsg(null), 4000);
    setActivePrintPallet(newPallet);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-slate-950 font-bold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-bounce border border-amber-400">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Print Modal */}
      {activePrintPallet && (
        <GS1LabelPrintModal
          pallet={activePrintPallet}
          onClose={() => setActivePrintPallet(null)}
        />
      )}

      {/* Module Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-purple-600" />
            Paletização Expedição — Geração SSCC GS1-128
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Paletização de Guias de Transporte com restrições Sonae MC, tagging SSCC-18 e impressão de etiquetas GS1.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg text-xs font-mono text-purple-700">
          <ShieldCheck className="w-4 h-4 text-purple-600" />
          <span>Regra: <strong>{activeRule.cliente_nome}</strong></span>
        </div>
      </div>

      {/* Grid: Inputs Calculator & Visual Stack Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Form: Select Guia & Linha & Packing Parameters (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">

            {/* Seleção Guia */}
            <div>
              <label className="text-slate-700 block mb-2 font-medium text-sm">1. Selecionar Guia de Transporte</label>
              <select
                value={selectedGuiaId}
                onChange={(e) => setSelectedGuiaId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono text-purple-700 font-bold focus:outline-none focus:border-purple-500"
              >
                {guias.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.numero_guia} - {g.cliente_nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Seleção Linha */}
            {selectedGuia && (
              <div>
                <label className="text-slate-700 block mb-2 font-medium text-sm">Linha de Produto</label>
                <select
                  value={selectedLinhaId}
                  onChange={(e) => setSelectedLinhaId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono text-purple-700 font-bold focus:outline-none focus:border-purple-500"
                >
                  {selectedGuia.linhas.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.artigo_codigo} - {l.artigo_descricao.slice(0, 30)}...
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Linha Summary */}
            {activeLinha && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 font-mono text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>Artigo: <strong>{activeLinha.artigo_descricao}</strong></span>
                  <span>EAN: <strong className="text-purple-600">{activeLinha.ean_barcode}</strong></span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-slate-200 text-center shadow-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">QTD SOLICITADA</span>
                    <span className="text-sm font-bold text-slate-800">{caixasSolicitadas} Cx</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-purple-600 block">TEMPERATURA</span>
                    <span className="text-sm font-bold text-purple-700">{activeLinha.temperatura_armazenamento}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">LOTE</span>
                    <span className="text-sm font-bold text-slate-800">{activeLinha.lote}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Pallet Stacking Parameters */}
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-3 pt-2">
              <Layers className="w-4 h-4 text-purple-600" />
              2. Definir Plano de Empilhamento
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-medium">Caixas por Camada</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={caixasPorCamada}
                  onChange={(e) => setCaixasPorCamada(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 font-mono text-purple-700 font-bold focus:outline-none focus:border-purple-500 text-base shadow-xs"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-medium">Número de Camadas</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={numCamadas}
                  onChange={(e) => setNumCamadas(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 font-mono text-purple-700 font-bold focus:outline-none focus:border-purple-500 text-base shadow-xs"
                />
              </div>
            </div>

            {/* Validação */}
            <div className="space-y-2 pt-2">
              {excedeAltura && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span><strong>Aviso:</strong> Altura ({alturaPaleteCm} cm) excede limite {activeRule.altura_maxima_cm} cm!</span>
                </div>
              )}

              {excedePeso && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span><strong>Aviso:</strong> Peso ({pesoBrutoKg} kg) excede limite {activeRule.peso_maximo_kg} kg!</span>
                </div>
              )}

              {excedeQuantidade && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span><strong>Erro:</strong> Palete requer {caixasNaPaleteProposta} caixas, mas guia tem só {caixasSolicitadas}!</span>
                </div>
              )}
            </div>

            {/* Metrics Summary */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">ALTURA TOTAL</span>
                <span className={`text-base font-bold ${excedeAltura ? 'text-rose-600' : 'text-slate-900'}`}>
                  {alturaPaleteCm} cm
                </span>
                <span className="text-[10px] text-slate-500 block">Máx: {activeRule.altura_maxima_cm} cm</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">PESO BRUTO</span>
                <span className={`text-base font-bold ${excedePeso ? 'text-rose-600' : 'text-slate-900'}`}>
                  {pesoBrutoKg} kg
                </span>
                <span className="text-[10px] text-slate-500 block">Máx: {activeRule.peso_maximo_kg} kg</span>
              </div>
            </div>

            {/* Botão Materializar */}
            <button
              onClick={handleMaterializePallet}
              disabled={excedeQuantidade || excedeAltura || excedePeso}
              className={`w-full py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                excedeQuantidade || excedeAltura || excedePeso
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md active:scale-95'
              }`}
            >
              <Plus className="w-5 h-5" />
              Materializar Palete + Imprimir Etiqueta
            </button>
          </div>
        </div>

        {/* Right: Visual Stack Preview (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-3">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Visualização da Palete Proposta
            </h3>

            {/* Stack Visual */}
            <div className="flex flex-col gap-1 bg-amber-50 p-3 rounded-lg border border-amber-200 font-mono text-xs">
              <div className="h-5 bg-amber-900/80 border border-amber-700/60 rounded flex items-center justify-around px-2 text-[9px] font-mono text-amber-300 font-bold shadow-md">
                <span>|||</span>
                <span>EURO PALLET 120x80</span>
                <span>|||</span>
              </div>

              {Array.from({ length: numCamadas }).map((_, layerIdx) => (
                <div
                  key={layerIdx}
                  className="h-7 bg-amber-500/20 border border-amber-500/40 rounded flex items-center justify-center text-xs font-mono font-bold text-amber-300 transition-all hover:bg-amber-500/30"
                >
                  Camada {layerIdx + 1}: {caixasPorCamada} caixas
                </div>
              ))}
            </div>

            <span className="text-xs font-mono text-slate-400 mt-2">
              Total: {caixasNaPaleteProposta} Caixas • {numCamadas} Camadas
            </span>

            {/* Dimensões */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Ruler className="w-4 h-4 text-slate-600" />
                <span className="font-mono font-bold text-slate-900">120 × 80 × {alturaPaleteCm} cm</span>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-200">
                <Scale className="w-4 h-4 text-slate-600" />
                <span className="font-mono font-bold text-lg text-slate-900">{pesoBrutoKg} kg</span>
                <span className="text-xs text-slate-500 font-mono">({pesoLiquidoKg} kg líquido)</span>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-200">
                <Tag className="w-4 h-4 text-slate-600" />
                <span className="font-mono font-bold text-sm text-slate-900">Volume: {(caixasNaPaleteProposta * 0.01).toFixed(2)} m³</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg text-sm text-purple-800">
        <div className="flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-purple-600" />
          <div>
            <strong>Caderno de Encargos Sonae MC:</strong> Altura máxima {activeRule.altura_maxima_cm}cm | Peso máximo {activeRule.peso_maximo_kg}kg
          </div>
        </div>
      </div>
    </div>
  );
};
