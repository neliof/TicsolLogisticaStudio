import { useEffect, useState } from 'react';
import { ReceivingOrder, PalletSSCC, StockPosition } from '../types/wms';
import { api, LinhaReconciliacao } from '../api';

/**
 * Converte uma linha da vista de reconciliação (saldo ARTSOFT por produto) numa
 * StockPosition. O snapshot é o saldo contabilístico do ERP, não uma posição
 * física — por isso os campos de localização/lote/SSCC ficam neutros; a
 * quantidade vai em unidades.
 */
function snapshotParaStock(r: LinhaReconciliacao): StockPosition {
  const qtd = Number(r.quantidade_artsoft) || 0;
  return {
    id: r.produto_id,
    localizacao_codigo: 'ERP',
    zona: 'Cais de Receção',
    artigo_codigo: r.sku_interno,
    artigo_descricao: r.descricao,
    ean_barcode: r.ean13 || '',
    lote: '',
    data_validade: '',
    dias_para_validade: 0,
    fefo_status: 'OK',
    qtd_caixas: 0,
    qtd_unidades: qtd,
    peso_kg: 0,
    empresa_owner: '',
    reservado_pedido: false,
    data_entrada: r.ultima_sincronizacao || '',
  };
}

export function useWMSData() {
  // Sem fonte real de receções (documento são guias de saída); começa vazio.
  const [orders, setOrders] = useState<ReceivingOrder[]>([]);
  const [pallets, setPallets] = useState<PalletSSCC[]>([]);
  const [stock, setStock] = useState<StockPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [recon, paletesRows] = await Promise.all([
          api.reconciliacaoStock(500),
          api.paletes(500).catch(() => [] as any[]),
        ]);

        setStock(
          recon
            .filter((r) => (Number(r.quantidade_artsoft) || 0) > 0)
            .map(snapshotParaStock)
        );
        setPallets(paletesRows as unknown as PalletSSCC[]);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar dados do WMS.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  return { orders, pallets, stock, loading, error, setOrders, setPallets, setStock };
}
