import React, { useState } from 'react';
import { GuiaTransporte, PaletaExpedicao, LinhaGuia } from '../types/expedicao';
import { PalletSSCC, RuleConfig } from '../types/wms';
import { generateSSCC, buildGS1128String, formatToGS1Date } from '../utils/gs1';
import { GS1LabelPrintModal } from './GS1LabelPrintModal';
import { BarcodeRenderer } from './BarcodeRenderer';
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

  // Packing List mode: multi-produto
  const [packingMode, setPackingMode] = useState(false);
  const [selectedLinhasIds, setSelectedLinhasIds] = useState<Set<string>>(new Set([selectedLinhaId]));

  // Rule: Sonae MC caderno de encargos
  const activeRule = ruleConfigs.find(r => r.cliente_id === 'SONAE_MC') || ruleConfigs[0];

  // Paletização inputs
  const [caixasPorCamada, setCaixasPorCamada] = useState<number>(10);
  const [numCamadas, setNumCamadas] = useState<number>(4);
  const [activePrintPallet, setActivePrintPallet] = useState<PalletSSCC | null>(null);
  const [printPalletList, setPrintPalletList] = useState<PalletSSCC[]>([]); // múltiplas etiquetas
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
    if (!selectedGuia) return;

    // Packing List: múltiplas linhas
    const linhasApalete = packingMode
      ? Array.from(selectedLinhasIds).map(id => selectedGuia.linhas.find(l => l.id === id)).filter(Boolean) as LinhaGuia[]
      : [activeLinha].filter(Boolean);

    if (linhasApalete.length === 0) {
      alert('Seleciona pelo menos uma linha!');
      return;
    }

    // Validar compatibilidade temperatura (packing list)
    if (packingMode) {
      const temps = new Set(linhasApalete.map(l => l.temperatura_armazenamento));
      if (temps.size > 1) {
        const hasIsolated = linhasApalete.some(l => l.requer_palote_separada);
        if (hasIsolated) {
          alert('Erro: Não pode misturar produtos com isolamento forçado (requer_palote_separada) com outras temperaturas!');
          return;
        }
      }
    }

    // Calcular totais packing list
    const totalCaixas = linhasApalete.reduce((sum, l) => sum + l.quantidade_solicitada, 0);
    const totalPeso = linhasApalete.reduce((sum, l) => sum + l.quantidade_solicitada * l.peso_unitario_kg, 0);
    const totalVolume = linhasApalete.reduce((sum, l) => sum + l.quantidade_solicitada * l.volume_unitario_m3, 0);

    if (packingMode && caixasNaPaleteProposta > totalCaixas) {
      alert(`Erro: Palete requer ${caixasNaPaleteProposta} caixas mas packing tem só ${totalCaixas}!`);
      return;
    }

    // Gerar SSCC
    const { ssccFull } = generateSSCC(3, '5601234');
    const primeiraLinha = linhasApalete[0];
    const validadeGS1 = formatToGS1Date(primeiraLinha.data_validade || '2027-12-31');
    const gs1128Str = buildGS1128String({
      sscc: ssccFull,
      gtinEan: primeiraLinha.ean_barcode,
      lote: primeiraLinha.lote || 'LOTE-STD',
      validadeYYMMDD: validadeGS1,
      qtdCaixas: caixasNaPaleteProposta
    });

    // Criar palete(s) para impressão
    let palletesToPrint: PalletSSCC[] = [];

    if (packingMode) {
      // Gerar etiqueta individual por artigo
      palletesToPrint = linhasApalete.map(linha => {
        const ssccItem = generateSSCC(3, '5601234').ssccFull;
        const validadeItem = formatToGS1Date(linha.data_validade || '2027-12-31');
        const gs1Item = buildGS1128String({
          sscc: ssccItem,
          gtinEan: linha.ean_barcode,
          lote: linha.lote || 'LOTE-STD',
          validadeYYMMDD: validadeItem,
          qtdCaixas: linha.quantidade_solicitada
        });

        return {
          sscc: ssccItem,
          guia_id: selectedGuia.id,
          artigo_codigo: linha.artigo_codigo,
          artigo_descricao: linha.artigo_descricao,
          ean_barcode: linha.ean_barcode,
          lote: linha.lote || 'LOTE-PADRAO',
          data_validade: linha.data_validade || '2027-12-31',
          caixas_na_palete: linha.quantidade_solicitada,
          unidades_totais: linha.quantidade_solicitada * 10,
          camadas: 1,
          caixas_por_camada: linha.quantidade_solicitada,
          altura_total_cm: 100,
          peso_liquido_kg: linha.quantidade_solicitada * linha.peso_unitario_kg * 0.9,
          peso_bruto_kg: linha.quantidade_solicitada * linha.peso_unitario_kg + 2,
          regrac_cliente_aplicada: 'SONAE_MC',
          empresa_owner: selectedGuia.cliente_nome,
          localizacao_atual: 'EM_STAGING',
          estado_palete: 'EM_STAGING',
          data_criacao: new Date().toISOString().replace('T', ' ').slice(0, 19),
          operador: 'Op. Paletização Expedição',
          gs1_128_barcode_string: gs1Item
        };
      });
    } else {
      // Mono-produto: uma etiqueta única
      const newPallet: PalletSSCC = {
        sscc: ssccFull,
        guia_id: selectedGuia.id,
        artigo_codigo: primeiraLinha.artigo_codigo,
        artigo_descricao: primeiraLinha.artigo_descricao,
        ean_barcode: primeiraLinha.ean_barcode,
        lote: primeiraLinha.lote || 'LOTE-PADRAO',
        data_validade: primeiraLinha.data_validade || '2027-12-31',
        caixas_na_palete: caixasNaPaleteProposta,
        unidades_totais: caixasNaPaleteProposta * 10,
        camadas: numCamadas,
        caixas_por_camada: caixasPorCamada,
        altura_total_cm: alturaPaleteCm,
        peso_liquido_kg: totalPeso * 0.9,
        peso_bruto_kg: totalPeso + 22,
        regrac_cliente_aplicada: 'SONAE_MC',
        empresa_owner: selectedGuia.cliente_nome,
        localizacao_atual: 'EM_STAGING',
        estado_palete: 'EM_STAGING',
        data_criacao: new Date().toISOString().replace('T', ' ').slice(0, 19),
        operador: 'Op. Paletização Expedição',
        gs1_128_barcode_string: gs1128Str
      };
      palletesToPrint = [newPallet];
    }

    // Criar palete expedição
    const paletaExpedicao: PaletaExpedicao = {
      id: `pal-${Date.now()}`,
      sscc: ssccFull,
      guia_id: selectedGuia.id,
      linhas_guia: linhasApalete.map(l => l.id),
      produtos: linhasApalete.map(l => ({
        artigo_codigo: l.artigo_codigo,
        artigo_descricao: l.artigo_descricao,
        quantidade: l.quantidade_solicitada,
        lote: l.lote
      })),
      temperatura_zona: primeiraLinha.temperatura_armazenamento,
      peso_total_kg: totalPeso + 22,
      volume_total_m3: totalVolume,
      altura_palete_cm: alturaPaleteCm,
      dimensoes_palete_cm: `120x80x${alturaPaleteCm}`,
      status: 'PREPARANDO',
      data_criacao: new Date().toISOString(),
      operador_criacao: 'Op. Paletização Expedição'
    };

    onPalletCreated(paletaExpedicao, selectedGuia.id, primeiraLinha.id, caixasNaPaleteProposta);

    setToastMsg(`Palete SSCC ${ssccFull} criada! (${packingMode ? `Packing List - ${palletesToPrint.length} etiquetas` : 'Mono-produto'})`);
    setTimeout(() => setToastMsg(null), 4000);

    if (packingMode) {
      setPrintPalletList(palletesToPrint);
      setActivePrintPallet(null);
    } else {
      setActivePrintPallet(palletesToPrint[0]);
      setPrintPalletList([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-bounce border border-purple-400">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Print Modal - Single or Multiple */}
      {(activePrintPallet || printPalletList.length > 0) && (
        packingMode && printPalletList.length > 0 ? (
          // Multiple labels for packing list
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto no-print">
            <div className="relative bg-white border border-slate-200 rounded-xl shadow-2xl max-w-2xl w-full p-6 text-slate-900 my-8">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                <h3 className="font-semibold text-lg text-slate-900">
                  Etiquetas Packing List ({printPalletList.length} produtos)
                </h3>
                <button
                  onClick={() => setPrintPalletList([])}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => window.print()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm"
                >
                  🖨️ Imprimir {printPalletList.length} Etiquetas
                </button>
              </div>
              <div className="space-y-4">
                {printPalletList.map((pallet, idx) => (
                  <div key={idx} className="bg-white text-black p-8 rounded-lg border-2 border-black shadow-lg print:page-break-after-always min-h-[280mm] print:min-h-[297mm]">
                    <p className="text-center text-sm font-bold text-gray-600 mb-4">ETIQUETA LOGÍSTICA {idx + 1}/{printPalletList.length}</p>

                    {/* Header */}
                    <div className="border-b-4 border-black pb-4 mb-4">
                      <div className="flex justify-between items-start text-sm font-bold">
                        <div>
                          <p className="uppercase text-xs text-gray-600 font-bold">Remetente / Expedidor</p>
                          <p className="font-extrabold text-base">TicSol Logistics Hub B2B</p>
                          <p className="text-sm">Armazém Central Lisboa</p>
                          <p className="text-sm">NIF: 509876543</p>
                        </div>
                        <div className="text-right">
                          <p className="uppercase text-xs text-gray-600 font-bold">Destinatário</p>
                          <p className="font-extrabold text-base">{pallet.empresa_owner}</p>
                          <p className="text-sm">Plataforma Logística</p>
                        </div>
                      </div>
                    </div>

                    {/* Produto Info */}
                    <div className="border-b-4 border-black pb-4 mb-4">
                      <p className="uppercase text-xs font-bold text-gray-600 mb-2">Descrição do Produto</p>
                      <p className="font-bold text-lg">{pallet.artigo_descricao}</p>
                      <p className="font-mono text-sm text-gray-800 mb-3">Código: {pallet.artigo_codigo}</p>

                      <div className="grid grid-cols-4 gap-3 text-sm font-bold">
                        <div>
                          <p className="uppercase text-xs text-gray-600">Lote (10)</p>
                          <p className="font-mono text-base">{pallet.lote}</p>
                        </div>
                        <div>
                          <p className="uppercase text-xs text-gray-600">Validade (15)</p>
                          <p className="font-mono text-base">{pallet.data_validade}</p>
                        </div>
                        <div>
                          <p className="uppercase text-xs text-gray-600">Quantidade (37)</p>
                          <p className="font-mono text-base text-amber-800">{pallet.caixas_na_palete} CX</p>
                        </div>
                        <div>
                          <p className="uppercase text-xs text-gray-600">Peso Bruto</p>
                          <p className="font-mono text-base">{pallet.peso_bruto_kg} KG</p>
                        </div>
                      </div>
                    </div>

                    {/* GS1-128 Barcode */}
                    <div className="border-b-4 border-black pb-4 mb-4 text-center">
                      <p className="uppercase text-xs font-bold text-gray-600 mb-3">GS1-128 Produto (GTIN + Lote + Validade + QTD)</p>
                      <div className="flex justify-center">
                        <BarcodeRenderer value={pallet.gs1_128_barcode_string} height={60} />
                      </div>
                    </div>

                    {/* SSCC Barcode - Large */}
                    <div className="border-t-4 border-black pt-4 text-center flex-1">
                      <p className="uppercase text-xs font-bold text-gray-600 mb-3">SSCC GS1-18 Palete</p>
                      <div className="flex justify-center mb-3">
                        <BarcodeRenderer value={pallet.sscc} height={80} />
                      </div>
                      <p className="font-mono font-bold text-xl tracking-widest">{pallet.sscc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Single label for mono-produto
          <GS1LabelPrintModal
            pallet={activePrintPallet}
            onClose={() => setActivePrintPallet(null)}
          />
        )
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

            {/* Modo: Single-produto vs Packing List */}
            {selectedGuia && selectedGuia.linhas.length > 1 && (
              <div>
                <label className="text-slate-700 block mb-2 font-medium text-sm">Modo Paletização</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPackingMode(false)}
                    className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
                      !packingMode
                        ? 'bg-purple-600 text-white border-2 border-purple-700'
                        : 'bg-slate-100 text-slate-700 border-2 border-transparent hover:bg-slate-200'
                    }`}
                  >
                    Mono-Produto
                  </button>
                  <button
                    onClick={() => setPackingMode(true)}
                    className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
                      packingMode
                        ? 'bg-purple-600 text-white border-2 border-purple-700'
                        : 'bg-slate-100 text-slate-700 border-2 border-transparent hover:bg-slate-200'
                    }`}
                  >
                    Packing List (Multi)
                  </button>
                </div>
              </div>
            )}

            {/* Seleção Linha(s) */}
            {selectedGuia && !packingMode && (
              <div>
                <label className="text-slate-700 block mb-2 font-medium text-sm">Linha de Produto</label>
                <select
                  value={selectedLinhaId}
                  onChange={(e) => {
                    setSelectedLinhaId(e.target.value);
                    setSelectedLinhasIds(new Set([e.target.value]));
                  }}
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

            {/* Packing List: Multi-selection */}
            {selectedGuia && packingMode && (
              <div>
                <label className="text-slate-700 block mb-2 font-medium text-sm">Selecionar Produtos (Ctrl+Click)</label>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-slate-50 p-3 rounded-lg border border-slate-300">
                  {selectedGuia.linhas.map(l => (
                    <label key={l.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedLinhasIds.has(l.id)}
                        onChange={(e) => {
                          const newIds = new Set(selectedLinhasIds);
                          if (e.target.checked) {
                            newIds.add(l.id);
                          } else {
                            newIds.delete(l.id);
                          }
                          setSelectedLinhasIds(newIds);
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-mono text-purple-700">
                        {l.artigo_codigo} ({l.quantidade_solicitada} un, {l.temperatura_armazenamento})
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-2 text-xs text-slate-600 bg-blue-50 p-2 rounded border border-blue-200">
                  ✓ Selecionadas: {selectedLinhasIds.size} | Total: {Array.from(selectedLinhasIds).reduce((sum, id) => {
                    const l = selectedGuia.linhas.find(x => x.id === id);
                    return sum + (l?.quantidade_solicitada || 0);
                  }, 0)} unidades
                </div>
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
            <div className="flex flex-col gap-1 bg-gradient-to-b from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-300 font-mono text-xs">
              <div className="h-5 bg-gradient-to-r from-purple-700 to-purple-900 border border-purple-600 rounded flex items-center justify-around px-2 text-[9px] font-mono text-purple-200 font-bold shadow-md">
                <span>|||</span>
                <span>EURO PALLET 120x80</span>
                <span>|||</span>
              </div>

              {Array.from({ length: numCamadas }).map((_, layerIdx) => (
                <div
                  key={layerIdx}
                  className="h-7 bg-gradient-to-r from-purple-400/30 to-purple-500/30 border border-purple-500/50 rounded flex items-center justify-center text-xs font-mono font-bold text-purple-700 transition-all hover:from-purple-400/50 hover:to-purple-500/50 shadow-sm"
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
