import React from 'react';

export interface PrinterConfig {
  connectionMode: 'usb' | 'network';
  usb?: {
    vendorId: string;
    productId: string;
  };
  network?: {
    ip: string;
    port: number;
  };
  paperSize: {
    width: number;   // mm
    height: number;  // mm
  };
  dpi: 203 | 300;
}

export interface PackingListProduct {
  artigo_codigo: string;
  artigo_descricao: string;
  quantidade: number;
  lote: string;
  ean_barcode: string;
  data_validade: string;
}

export interface LabelData {
  type: 'single' | 'packing-list';
  pallet: {
    sscc: string;
    empresa_owner: string;
    regrac_cliente_aplicada: string;
    artigo_descricao: string;
    artigo_codigo: string;
    lote: string;
    data_validade: string;
    caixas_na_palete: number;
    peso_bruto_kg: number;
    ean_barcode: string;
    operador: string;
    data_criacao: string;
  };
  products?: PackingListProduct[];
}

export interface CompactState {
  fontSize: 25 | 20 | 16;
  barcodeHeight: 50 | 40 | 30;
  marginPx: 50 | 30 | 15;
  sectionPadding: 2 | 1;
  iteration: 0 | 1 | 2 | 3;
}

export interface CompactedLabel {
  content: React.ReactNode;
  compactState: CompactState;
  estimatedHeightMm: number;
}

export interface Label {
  id: string;
  order: number;
  content: React.ReactNode;
  compactState: CompactState;
  estimatedHeightMm: number;
}

export interface CompilationResult {
  zpl: string[];
  pages: number;
  status: 'success' | 'warning' | 'error';
  message?: string;
  preview?: string;  // base64 PNG
}
