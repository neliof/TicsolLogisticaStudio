// Tipos para módulo Expedição

export interface PedidoCompra {
  id: string;
  numero: string;
  data_pedido: string;
  fornecedor_codigo: string;
  fornecedor_nome: string;
  artsoft_order_id: string;
  status: 'PENDENTE' | 'CONFIRMADO' | 'PREPARANDO' | 'PRONTO' | 'EXPEDIDO' | 'ENTREGUE';
  linhas: LinhaExpedicao[];
  data_entrega_prevista: string;
  cliente_nome: string;
  endereco_entrega: string;
  empresa_tenant: string;
}

export interface LinhaExpedicao {
  id: string;
  pedido_id: string;
  artigo_codigo: string;
  artigo_descricao: string;
  ean_barcode: string;
  quantidade_pedida: number;
  quantidade_preparada: number;
  quantidade_faltante: number;
  lote: string;
  data_validade: string;
  peso_unitario_kg: number;
  temperatura_armazenamento: string; // "AMBIENTE" | "FRESCO" | "CONGELADO"
  requer_palote_separada: boolean; // se True, não pode misturar com outros artigos
  status: 'NAO_INICIADA' | 'PREPARANDO' | 'PRONTA' | 'PALETIZADA' | 'EXPEDIDA';
}

export interface GuiaTransporte {
  id: string;
  numero_guia: string;
  data_emissao: string;
  pedido_compra_id: string;
  paletes_sscc: string[]; // array de SSCC codes
  peso_total_kg: number;
  volume_m3: number;
  transportador_nome: string;
  transportador_veiculo: string;
  motorista_nome: string;
  data_saida_prevista: string;
  observacoes: string;
  status: 'RASCUNHO' | 'PRONTA_EMBARQUE' | 'EMBARCADA' | 'EM_TRANSITO' | 'ENTREGUE';
}

export interface PaletaExpedicao {
  id: string;
  sscc: string;
  pedido_id: string;
  linhas_pedido: string[]; // array de LinhaExpedicao.id
  peso_bruto_kg: number;
  altura_cm: number;
  dimensoes_cm: string; // "100x120x150"
  temperatura_requerida: string;
  produtos: {
    artigo_codigo: string;
    quantidade: number;
    lote: string;
  }[];
  created_at: string;
  status: 'PREPARANDO' | 'PRONTA' | 'EMBARCADA';
}

export interface ChecklistExpedicao {
  id: string;
  palete_id: string;
  item: string;
  concluido: boolean;
  operador: string;
  timestamp: string;
}
