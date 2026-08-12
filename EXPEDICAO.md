# Módulo Expedição — Workflow Sonae → Imefar

## Visão Geral

Novo módulo para **Expedição de encomendas**:
- **Cliente:** Sonae MC Distribuição (faz pedidos)
- **Fornecedor:** Imefar (tem ERP ARTSOFT)
- **Fluxo:** Pedido Compra → Paletização Multi-Produto → Guia Transporte

## Arquitetura

```
Pedido Compra (PC-2026-0051)
├── 3 Linhas:
│   ├── L001: 240x Azeite 5L (AMBIENTE)
│   ├── L002: 600x Azeite 1L (AMBIENTE)
│   └── L003: 480x Leite 1L (FRESCO — palete separada)
│
├── Paletização (Auto-calculada):
│   ├── PAL-EXP-001: Azeites (240+600) → 1248kg, 145cm, AMBIENTE
│   └── PAL-EXP-002: Leite (480) → 504kg, 165cm, FRESCO
│
└── Guia Transporte (Gerada):
    ├── GT-PC-2026-0051-2026-08-12
    ├── 2 paletes SSCC
    ├── 1752kg, 2.1m³
    ├── DHL + Frigorífico
    └── Status: PRONTA_EMBARQUE
```

## Tipos

```typescript
// Pedido de Compra (encomenda Sonae faz ao fornecedor)
interface PedidoCompra {
  id: string;
  numero: string;
  fornecedor_nome: string; // "Imefar"
  artsoft_order_id: string; // ID ERP
  status: 'PENDENTE' | 'CONFIRMADO' | 'PREPARANDO' | 'PRONTO' | 'EXPEDIDO' | 'ENTREGUE';
  linhas: LinhaExpedicao[];
}

// Linha de Pedido (cada produto)
interface LinhaExpedicao {
  artigo_codigo: string;
  quantidade_pedida: number;
  temperatura_armazenamento: 'AMBIENTE' | 'FRESCO' | 'CONGELADO';
  requer_palote_separada: boolean; // Se true, não mistura
  status: 'NAO_INICIADA' | 'PREPARANDO' | 'PRONTA' | 'PALETIZADA' | 'EXPEDIDA';
}

// Palete para Expedição (múltiplos produtos compatíveis)
interface PaletaExpedicao {
  sscc: string; // Código GS1
  pedido_id: string;
  linhas_pedido: string[]; // Array de LinhaExpedicao.id
  produtos: { artigo_codigo, quantidade, lote }[];
  temperatura_requerida: string; // Mais restritiva das linhas
  status: 'PREPARANDO' | 'PRONTA' | 'EMBARCADA';
}

// Guia de Transporte (emitida ao embarcar)
interface GuiaTransporte {
  numero_guia: string; // GT-PC-2026-0051-2026-08-12
  pedido_compra_id: string;
  paletes_sscc: string[]; // Array de SSCC
  peso_total_kg: number;
  volume_m3: number;
  transportador_nome: string;
  motorista_nome: string;
  data_saida_prevista: string;
  status: 'RASCUNHO' | 'PRONTA_EMBARQUE' | 'EMBARCADA' | 'EM_TRANSITO' | 'ENTREGUE';
}
```

## Fluxo Funcional

### 1. Receber Pedido Compra (CONFIRMADO)
```
Sonae → Imefar: "Preciso de 240x Azeite 5L + 600x Azeite 1L + 480x Leite"
ARTSOFT gera: PC-2026-0051 com 3 linhas
Status: CONFIRMADO
```

### 2. Preparar Mercadoria (PREPARANDO)
```
Armazém Imefar separa produtos por temperatura:
- Grupo AMBIENTE: Azeites (compatíveis)
- Grupo FRESCO: Leite (isolado)

Atualiza linhas: NAO_INICIADA → PREPARANDO
```

### 3. Calcular Paletização (Auto-calculada)
```typescript
// Regra: produtos mesmo grupo térmico na mesma palete
PaletaExpedicao[] = [
  { sscc: '66123450001234500015', linhas: [L001, L002], temp: 'AMBIENTE' },
  { sscc: '66123450001234500016', linhas: [L003], temp: 'FRESCO' }
]
```

### 4. Validar Checklist Pré-Expedição
```
☑ Todas linhas preparadas
☑ Paletas com SSCC válidos
☑ Documentação ARTSOFT OK
☑ Temperaturas confirmadas
☑ Transporte frigorífico disponível
☑ Peso/volume dentro limites
```

### 5. Gerar Guia Transporte (AUTO)
```
Botão "Gerar e Expedir":
- Cria GuiaTransporte
- Agrega SSCCs
- Calcula peso total
- Assign transportador (DHL, etc.)
- Emite GT-PC-2026-0051-2026-08-12
- Atualiza status → EXPEDIDO
- Log auditoria criado
```

### 6. Embarcar e Sincronizar
```
- Status: PRONTA_EMBARQUE → EMBARCADA
- ARTSOFT atualiza ordem: "Expedida"
- Guia enviada via EDI ao transportador
- Rastreio iniciado
```

## Integrações

### Com Receção
Não diretamente — Expedição é para **encomendas que Imefar faz enviar a Sonae**.

### Com ARTSOFT
- Lê: `Pedido Compra` (PC-NNNN-NNNN)
- Lê: Stock disponível por lote/temperatura
- Escreve: Status palete (`PALETIZADA`)
- Escreve: Guia transporte (`EXPEDIDA`)
- Escreve: Log auditoria

### Com Paletização
A paletização é **automática** baseada em:
1. Temperatura de armazenamento
2. Requisitos `requer_palote_separada`
3. Peso máximo palete (1500kg)
4. Altura máxima (200cm)

## Campos Críticos

| Campo | Função | Validação |
|-------|--------|-----------|
| `temperature_armazenamento` | Agrupa produtos compatíveis | AMBIENTE < FRESCO < CONGELADO |
| `requer_palote_separada` | Força isolamento (leite, congelados) | Boolean, consultado no ARTSOFT |
| `artsoft_order_id` | Link com ERP | Único por Pedido |
| `data_entrega_prevista` | SLA client | > data_hoje |

## Dados Mock

Ficheiro: `src/data/mockExpedicao.ts`

```
INITIAL_PEDIDOS_COMPRA = [
  PC-2026-0051 (PREPARANDO): 3 linhas, 1752kg total
  PC-2026-0052 (CONFIRMADO): 1 linha, manteiga biológica
]

INITIAL_PALETAS_EXPEDICAO = [
  PAL-EXP-001: 66123450001234500015 (azeites)
  PAL-EXP-002: 66123450001234500016 (leite)
]

INITIAL_GUIAS_TRANSPORTE = [
  GT-001: GT-PC-2026-0051-2026-08-12 (PRONTA_EMBARQUE)
]
```

## Próximas Features

1. **Integração ARTSOFT Real**
   - Sync automático de Pedidos Compra
   - Atualizar stock em tempo real

2. **Rastreio de Transportador**
   - Webhook de status (em trânsito, entregue)
   - Sincronizar com Sonae

3. **Etiquetas de Palete**
   - Gerar código de barras SSCC
   - Imprimir label frigorífico

4. **Alocação Dinâmica de Transporte**
   - Calcular automático de transportador
   - Otimizar rotas

5. **Devolução e Tratamento**
   - Registar produtos rejeitados
   - Nota de crédito automática
