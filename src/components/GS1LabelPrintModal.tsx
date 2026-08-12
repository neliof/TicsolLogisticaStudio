import React from 'react';
import { PalletSSCC } from '../types/wms';
import { BarcodeRenderer } from './BarcodeRenderer';
import { X, Printer, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';

interface GS1LabelPrintModalProps {
  pallet: PalletSSCC | null;
  onClose: () => void;
}

export const GS1LabelPrintModal: React.FC<GS1LabelPrintModalProps> = ({ pallet, onClose }) => {
  if (!pallet) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto no-print">
      <div className="relative bg-white border border-slate-200 rounded-xl shadow-2xl max-w-2xl w-full p-6 text-slate-900 my-8">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900">Etiqueta Logística GS1-128 (SSCC)</h3>
              <p className="text-xs text-slate-500 font-mono">Formato Standard A5 (105mm x 148mm) • Regra {pallet.regrac_cliente_aplicada}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            Validação GS1 Modulo-10 Aprovada
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm transition-all text-sm cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            Imprimir Etiqueta
          </button>
        </div>

        {/* Physical GS1 Label Container (Renders exact label dimensions) */}
        <div className="bg-white text-black p-5 rounded-lg border-2 border-black max-w-md mx-auto font-sans shadow-lg select-text text-left">
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
          <div className="border-b-2 border-black pb-2 mb-2 grid grid-cols-2 gap-2 text-[11px]">
            <div className="col-span-2">
              <span className="text-[9px] font-bold text-gray-600 block uppercase">DESCRIÇÃO DO PRODUTO</span>
              <span className="font-bold text-sm text-black block leading-tight">{pallet.artigo_descricao}</span>
              <span className="font-mono text-xs text-gray-800">Cód: {pallet.artigo_codigo}</span>
            </div>
            
            <div className="border-t border-gray-300 pt-1">
              <span className="text-[9px] font-bold text-gray-600 block">LOTE (10)</span>
              <span className="font-mono font-bold text-xs">{pallet.lote}</span>
            </div>

            <div className="border-t border-gray-300 pt-1">
              <span className="text-[9px] font-bold text-gray-600 block">VALIDADE (15)</span>
              <span className="font-mono font-bold text-xs">{pallet.data_validade}</span>
            </div>

            <div className="border-t border-gray-300 pt-1">
              <span className="text-[9px] font-bold text-gray-600 block">QTD CAIXAS (37)</span>
              <span className="font-mono font-bold text-sm text-amber-800">{pallet.caixas_na_palete} CX</span>
            </div>

            <div className="border-t border-gray-300 pt-1">
              <span className="text-[9px] font-bold text-gray-600 block">PESO BRUTO</span>
              <span className="font-mono font-bold text-xs">{pallet.peso_bruto_kg} KG</span>
            </div>
          </div>

          {/* Section 3: GS1-128 Product Info Barcode */}
          <div className="border-b-2 border-black pb-2 mb-2 text-center">
            <span className="text-[9px] font-bold text-gray-600 block mb-1">
              GS1-128 (GTIN + LOTE + VALIDADE + QTD)
            </span>
            <BarcodeRenderer
              value={`(01)${pallet.ean_barcode}(10)${pallet.lote}(15)${pallet.data_validade.replace(/-/g, '').slice(2)}(37)${pallet.caixas_na_palete}`}
              height={40}
            />
          </div>

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

        {/* Footer info */}
        <div className="mt-4 text-center text-xs text-slate-500">
          Operador: {pallet.operador} • Data de Criação: {pallet.data_criacao}
        </div>
      </div>
    </div>
  );
};
