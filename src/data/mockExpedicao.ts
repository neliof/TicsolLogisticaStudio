import { PedidoCompra, LinhaExpedicao, PaletaExpedicao, GuiaTransporte } from '../types/expedicao';

export const INITIAL_PEDIDOS_COMPRA: PedidoCompra[] = [
  {
    id: 'PEDIDO-001',
    numero: 'PC-2026-0051',
    data_pedido: '2026-08-10',
    fornecedor_codigo: 'IMEFAR',
    fornecedor_nome: 'Imefar - Importadora de Alimentos',
    artsoft_order_id: 'ART-2026-88421',
    status: 'PREPARANDO',
    cliente_nome: 'Sonae MC Distribuição',
    endereco_entrega: 'Av. Fernão Magalhães, 1000 - Azambuja',
    data_entrega_prevista: '2026-08-14',
    empresa_tenant: 'TicSol_HuB (Sonae MC)',
    linhas: [
      {
        id: 'L001',
        pedido_id: 'PEDIDO-001',
        artigo_codigo: 'ART-5601-OIL',
        artigo_descricao: 'Azeite Virgem Extra Oliveira da Serra 5L',
        ean_barcode: '5601234567890',
        quantidade_pedida: 240,
        quantidade_preparada: 240,
        quantidade_faltante: 0,
        lote: 'LOTE-2026-088',
        data_validade: '2027-08-31',
        peso_unitario_kg: 5.2,
        temperatura_armazenamento: 'AMBIENTE',
        requer_palote_separada: false,
        status: 'PALETIZADA'
      },
      {
        id: 'L002',
        pedido_id: 'PEDIDO-001',
        artigo_codigo: 'ART-5602-OIL',
        artigo_descricao: 'Azeite Extra Virgem Português 1L',
        ean_barcode: '5602134567890',
        quantidade_pedida: 600,
        quantidade_preparada: 600,
        quantidade_faltante: 0,
        lote: 'LOTE-2026-089',
        data_validade: '2027-09-15',
        peso_unitario_kg: 1.1,
        temperatura_armazenamento: 'AMBIENTE',
        requer_palote_separada: false,
        status: 'PALETIZADA'
      },
      {
        id: 'L003',
        pedido_id: 'PEDIDO-001',
        artigo_codigo: 'ART-9801-LEIT',
        artigo_descricao: 'Leite Integral Lactose Free 1L',
        ean_barcode: '9801234567890',
        quantidade_pedida: 480,
        quantidade_preparada: 480,
        quantidade_faltante: 0,
        lote: 'LOTE-2026-122',
        data_validade: '2026-08-25',
        peso_unitario_kg: 1.05,
        temperatura_armazenamento: 'FRESCO',
        requer_palote_separada: true, // Leite não mistura com óleos
        status: 'PALETIZADA'
      }
    ]
  },
  {
    id: 'PEDIDO-002',
    numero: 'PC-2026-0052',
    data_pedido: '2026-08-11',
    fornecedor_codigo: 'IMEFAR',
    fornecedor_nome: 'Imefar - Importadora de Alimentos',
    artsoft_order_id: 'ART-2026-88422',
    status: 'CONFIRMADO',
    cliente_nome: 'Sonae MC Distribuição',
    endereco_entrega: 'Av. Fernão Magalhães, 1000 - Azambuja',
    data_entrega_prevista: '2026-08-16',
    empresa_tenant: 'TicSol_HuB (Sonae MC)',
    linhas: [
      {
        id: 'L004',
        pedido_id: 'PEDIDO-002',
        artigo_codigo: 'ART-7201-MANT',
        artigo_descricao: 'Manteiga Biológica 250g',
        ean_barcode: '7201234567890',
        quantidade_pedida: 1200,
        quantidade_preparada: 0,
        quantidade_faltante: 1200,
        lote: 'LOTE-2026-045',
        data_validade: '2027-02-14',
        peso_unitario_kg: 0.27,
        temperatura_armazenamento: 'FRESCO',
        requer_palote_separada: true,
        status: 'NAO_INICIADA'
      }
    ]
  }
];

export const INITIAL_PALETAS_EXPEDICAO: PaletaExpedicao[] = [
  {
    id: 'PAL-EXP-001',
    sscc: '66123450001234500015',
    pedido_id: 'PEDIDO-001',
    linhas_pedido: ['L001', 'L002'],
    peso_bruto_kg: 1248,
    altura_cm: 145,
    dimensoes_cm: '100x120x145',
    temperatura_requerida: 'AMBIENTE',
    produtos: [
      { artigo_codigo: 'ART-5601-OIL', quantidade: 240, lote: 'LOTE-2026-088' },
      { artigo_codigo: 'ART-5602-OIL', quantidade: 600, lote: 'LOTE-2026-089' }
    ],
    created_at: '2026-08-12T14:30:00Z',
    status: 'PRONTA'
  },
  {
    id: 'PAL-EXP-002',
    sscc: '66123450001234500016',
    pedido_id: 'PEDIDO-001',
    linhas_pedido: ['L003'],
    peso_bruto_kg: 504,
    altura_cm: 165,
    dimensoes_cm: '100x120x165',
    temperatura_requerida: 'FRESCO',
    produtos: [
      { artigo_codigo: 'ART-9801-LEIT', quantidade: 480, lote: 'LOTE-2026-122' }
    ],
    created_at: '2026-08-12T14:45:00Z',
    status: 'PRONTA'
  }
];

export const INITIAL_GUIAS_TRANSPORTE: GuiaTransporte[] = [
  {
    id: 'GT-001',
    numero_guia: 'GT-PC-2026-0051-2026-08-12',
    data_emissao: '2026-08-12',
    pedido_compra_id: 'PEDIDO-001',
    paletes_sscc: ['66123450001234500015', '66123450001234500016'],
    peso_total_kg: 1752,
    volume_m3: 2.1,
    transportador_nome: 'DHL Logistics',
    transportador_veiculo: 'MB Sprinter Frigorífico - AA-12-XX',
    motorista_nome: 'João Fernandes',
    data_saida_prevista: '2026-08-13',
    observacoes: 'Expedição urgente. Manter temperatura fresco para palete de leite. Rota direta Imefar → Azambuja.',
    status: 'PRONTA_EMBARQUE'
  }
];
