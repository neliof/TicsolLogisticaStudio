import React, { useState } from 'react';
import { PalletSSCC } from '../types/wms';
import { BarcodeRenderer } from './BarcodeRenderer';
import { X, Printer, ShieldCheck, Tag, Copy, Check, FileText, Layers } from 'lucide-react';

interface GS1LabelPrintModalProps {
  pallet: PalletSSCC | null;
  onClose: () => void;
  packingListProducts?: Array<{ artigo_codigo: string; artigo_descricao: string; quantidade: number; lote: string; ean_barcode: string; data_validade: string }>;
}

export const GS1LabelPrintModal: React.FC<GS1LabelPrintModalProps> = ({ pallet, onClose, packingListProducts }) => {
  const [singleLabel, setSingleLabel] = useState(true);
  const [paperFormat, setPaperFormat] = useState<'zebra' | 'a5' | 'a4'>('zebra');
  const [copiesCount, setCopiesCount] = useState<1 | 2>(1);
  const [copied, setCopied] = useState(false);

  if (!pallet) return null;

  const handlePrint = () => {
    setTimeout(() => window.print(), 100);
  };

  const handleCopySSCC = () => {
    if (pallet?.sscc) {
      navigator.clipboard.writeText(pallet.sscc);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatSSCCHuman = (sscc: string) => {
    const clean = sscc.replace(/\D/g, '');
    if (clean.length === 18) {
      return `(00) ${clean.slice(0, 1)} ${clean.slice(1, 8)} ${clean.slice(8, 17)} ${clean.slice(17)}`;
    }
    return `(00) ${sscc}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 md:p-6 overflow-y-auto modal-backdrop">
      <div className={`relative bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-3xl w-full p-5 text-slate-900 my-4 modal-container print-paper-${paperFormat}`}>
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 leading-tight">Etiqueta Logística GS1-128 (SSCC)</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Validação Módulo-10 Aprovada • Regra do Cliente: <span className="font-semibold text-slate-700">{pallet.regrac_cliente_aplicada}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bar de Ações & Configuração de Impressão */}
        <div className="space-y-3 mb-5 no-print">
          {/* Top Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySSCC}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                {copied ? 'SSCC Copiado!' : 'Copiar SSCC'}
              </button>

              <span className="text-xs text-slate-400">|</span>

              <div className="flex items-center gap-1 text-xs text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Norma GS1-128
              </div>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-semibold rounded-xl shadow-md transition-all text-sm cursor-pointer ml-auto"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimir Etiqueta{!singleLabel && packingListProducts ? `s (${packingListProducts.length * copiesCount})` : copiesCount > 1 ? ` (2 Lados)` : ''}</span>
            </button>
          </div>

          {/* Selector de Perfil de Impressora / Papel + Duplicação GS1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 text-xs">
            {/* Papel */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Formato / Impressora:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaperFormat('zebra')}
                  className={`py-1.5 px-2 rounded-lg font-medium text-center transition-all cursor-pointer ${
                    paperFormat === 'zebra'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Zebra 100x150
                </button>
                <button
                  type="button"
                  onClick={() => setPaperFormat('a5')}
                  className={`py-1.5 px-2 rounded-lg font-medium text-center transition-all cursor-pointer ${
                    paperFormat === 'a5'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Folha A5
                </button>
                <button
                  type="button"
                  onClick={() => setPaperFormat('a4')}
                  className={`py-1.5 px-2 rounded-lg font-medium text-center transition-all cursor-pointer ${
                    paperFormat === 'a4'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Folha A4
                </button>
              </div>
            </div>

            {/* Cópias por Palete */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Aposição por Palete (Norma GS1 B2B):
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setCopiesCount(1)}
                  className={`py-1.5 px-2 rounded-lg font-medium text-center transition-all cursor-pointer ${
                    copiesCount === 1
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  1 Cópia
                </button>
                <button
                  type="button"
                  onClick={() => setCopiesCount(2)}
                  className={`py-1.5 px-2 rounded-lg font-medium text-center transition-all cursor-pointer ${
                    copiesCount === 2
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                  title="2 Etiquetas (Frente + Lateral) por palete conforme recomendação B2B GS1"
                >
                  2 Cópias (Frente + Lateral)
                </button>
              </div>
            </div>
          </div>

          {/* Modo Impressão - Único vs Individual para Packing List */}
          {packingListProducts && packingListProducts.length > 1 && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <label className="text-xs font-semibold text-amber-900 block mb-1.5">Modo de Packing List:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSingleLabel(true)}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                    singleLabel
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-amber-200 hover:bg-amber-100/50'
                  }`}
                >
                  Etiqueta Consolidada (Packing List)
                </button>
                <button
                  type="button"
                  onClick={() => setSingleLabel(false)}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                    !singleLabel
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-amber-200 hover:bg-amber-100/50'
                  }`}
                >
                  Etiquetas Individuais ({packingListProducts.length} itens)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PREVIEW CONTAINER - Renderização da Etiqueta Reorganizada GS1-128 */}
        <div className="label-print-area-wrapper max-h-[62vh] overflow-y-auto pr-1">
          {Array.from({ length: copiesCount }).map((_, copyIndex) => (
            <React.Fragment key={`copy-${copyIndex}`}>
              {singleLabel || !packingListProducts ? (
                // ETIQUETA GS1-128 PRINCIPAL / CONSOLIDADA
                <div className="bg-white text-black p-5 border-2 border-black max-w-md mx-auto font-sans shadow-lg select-text text-left label-print-area my-2 relative">
            {/* Section 1: Header Logistics */}
            <div className="border-b-2 border-black pb-2 mb-2">
              <div className="flex justify-between items-start text-[10px] font-bold tracking-tight">
                <div>
                  <p className="uppercase text-[9px] text-gray-600">REMETENTE / EXPEDIDOR</p>
                  <p className="font-extrabold text-[11px] text-slate-900">TicSol Logistics Hub B2B</p>
                  <p>Armazém Central Lisboa - Cais 02</p>
                  <p>NIF: 509876543</p>
                </div>
                <div className="text-right">
                  <p className="uppercase text-[9px] text-gray-600">DESTINATÁRIO</p>
                  <p className="font-extrabold text-[11px] text-slate-900">{pallet.empresa_owner}</p>
                  <p>Plataforma Logística Azambuja</p>
                  <p>Cód. Cliente: {pallet.regrac_cliente_aplicada}</p>
                </div>
              </div>
            </div>

            {/* Section 2: Article & Batch Metadata */}
            <div className="border-b-2 border-black pb-2 mb-2 text-[11px]">
              <div className="mb-2">
                <span className="text-[9px] font-bold text-gray-600 block uppercase">
                  {packingListProducts ? 'PACKING LIST (MÚLTIPLOS PRODUTOS)' : 'DESCRIÇÃO DO PRODUTO'}
                </span>
                {packingListProducts ? (
                  <div className="space-y-1 mt-1">
                    {packingListProducts.map((prod, idx) => (
                      <div key={idx} className="text-[9px] border-t border-gray-300 pt-1">
                        <span className="font-bold text-black">{prod.artigo_descricao}</span>
                        <div className="flex justify-between font-mono">
                          <span>Cód: {prod.artigo_codigo}</span>
                          <span className="font-bold text-amber-800">{prod.quantidade} un</span>
                        </div>
                        <div className="text-[8px] text-gray-600 mt-0.5">Lote: {prod.lote} | Val: {prod.data_validade}</div>
                        <div className="mt-0.5 text-center">
                          <BarcodeRenderer
                            value={`(01)${prod.ean_barcode}(10)${prod.lote}(15)${prod.data_validade.replace(/-/g, '').slice(2)}(37)${prod.quantidade}`}
                            height={24}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <span className="font-bold text-sm text-black block leading-tight">{pallet.artigo_descricao}</span>
                    <span className="font-mono text-xs text-gray-800">Cód: {pallet.artigo_codigo}</span>
                  </>
                )}
              </div>

              {!packingListProducts && (
                <div className="grid grid-cols-2 gap-2 border-t border-gray-300 pt-2">
                  <div>
                    <span className="text-[9px] font-bold text-gray-600 block">LOTE (10)</span>
                    <span className="font-mono font-bold text-xs">{pallet.lote}</span>
                  </div>

                  <div>
                    <span className="text-[9px] font-bold text-gray-600 block">VALIDADE (15)</span>
                    <span className="font-mono font-bold text-xs">{pallet.data_validade}</span>
                  </div>

                  <div>
                    <span className="text-[9px] font-bold text-gray-600 block">QTD CAIXAS (37)</span>
                    <span className="font-mono font-bold text-sm text-amber-800">{pallet.caixas_na_palete} CX</span>
                  </div>

                  <div>
                    <span className="text-[9px] font-bold text-gray-600 block">PESO BRUTO</span>
                    <span className="font-mono font-bold text-xs">{pallet.peso_bruto_kg} KG</span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: GS1-128 Product Info Barcode (only for mono-produto) */}
            {!packingListProducts && (
              <div className="border-b-2 border-black pb-2 mb-2 text-center">
                <span className="text-[9px] font-bold text-gray-600 block mb-1">
                  GS1-128 (GTIN + LOTE + VALIDADE + QTD)
                </span>
                <BarcodeRenderer
                  value={`(01)${pallet.ean_barcode}(10)${pallet.lote}(15)${pallet.data_validade.replace(/-/g, '').slice(2)}(37)${pallet.caixas_na_palete}`}
                  height={40}
                />
              </div>
            )}

            {/* Section 4: Master SSCC Barcode */}
            <div className="text-center bg-gray-50 p-2 border border-black rounded">
              <span className="text-[10px] font-extrabold text-black block mb-1 uppercase tracking-wider">
                SSCC - CÓDIGO SEQUENCIAL DE RECIPIENTE DE TRANSPORTE
              </span>
              <BarcodeRenderer
                value={`(00) ${pallet.sscc}`}
                height={55}
              />
              <span className="font-mono text-sm font-extrabold tracking-widest text-black mt-1 block">
                SSCC: {pallet.sscc}
              </span>
            </div>
          </div>
          </div>
        ) : (
          // Etiquetas individuais (uma por produto) - scroll-snap: uma etiqueta completa de cada vez
          <div className="space-y-4 max-h-[65vh] overflow-y-auto snap-y snap-mandatory scroll-pt-4 pr-1 label-print-area-wrapper">
            {packingListProducts.map((prod, idx) => (
              <div key={idx} className="bg-white text-black p-5 rounded-lg border-2 border-black max-w-md mx-auto font-sans shadow-lg select-text text-left snap-start label-print-area">
                {/* Título etiqueta individual */}
                <div className="text-center mb-2 font-bold text-sm border-b-2 border-black pb-2 no-print">
                  ETIQUETA {idx + 1}/{packingListProducts.length}
                </div>

                {/* Section 1: Header */}
                <div className="border-b-2 border-black pb-2 mb-2">
                  <div className="flex justify-between items-start text-[10px] font-bold tracking-tight">
                    <div>
                      <p className="uppercase text-[9px] text-gray-600">REMETENTE</p>
                      <p className="font-extrabold text-[11px]">TicSol Logistics Hub B2B</p>
                    </div>
                    <div className="text-right">
                      <p className="uppercase text-[9px] text-gray-600">DESTINATÁRIO</p>
                      <p className="font-extrabold text-[11px]">{pallet.empresa_owner}</p>
                    </div>
                  </div>
                </div>

                {/* Section 2: Produto */}
                <div className="border-b-2 border-black pb-2 mb-2 text-[11px]">
                  <span className="text-[9px] font-bold text-gray-600 block uppercase mb-1">Produto</span>
                  <span className="font-bold text-black block">{prod.artigo_descricao}</span>
                  <span className="font-mono text-xs text-gray-800">Cód: {prod.artigo_codigo}</span>

                  <div className="grid grid-cols-2 gap-2 border-t border-gray-300 pt-2 mt-2 text-[10px]">
                    <div>
                      <span className="font-bold text-gray-600 block">LOTE</span>
                      <span className="font-mono">{prod.lote}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-600 block">VALIDADE</span>
                      <span className="font-mono">{prod.data_validade}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-600 block">QTD (un)</span>
                      <span className="font-mono text-amber-800 font-bold">{prod.quantidade}</span>
                    </div>
                  </div>
                </div>

                {/* Section 3: GS1-128 */}
                <div className="border-b-2 border-black pb-2 mb-2 text-center">
                  <span className="text-[8px] font-bold text-gray-600 block mb-1">GS1-128</span>
                  <BarcodeRenderer
                    value={`(01)${prod.ean_barcode}(10)${prod.lote}(15)${prod.data_validade.replace(/-/g, '').slice(2)}(37)${prod.quantidade}`}
                    height={35}
                  />
                </div>

                {/* Section 4: SSCC */}
                <div className="text-center bg-gray-50 p-2 border border-black rounded">
                  <span className="text-[9px] font-extrabold text-black block uppercase">SSCC</span>
                  <BarcodeRenderer
                    value={`(00) ${pallet.sscc}`}
                    height={40}
                  />
                  <span className="font-mono text-xs font-bold tracking-widest text-black mt-1 block">
                    {pallet.sscc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-3 text-center text-xs text-slate-500 no-print flex justify-between items-center px-2">
          <span>Regra de Cliente: <strong className="text-slate-700">{pallet.regrac_cliente_aplicada}</strong></span>
          <span>Operador: <strong className="text-slate-700">{pallet.operador}</strong></span>
        </div>
      </div>
    </div>
  );
};
