import { useEffect, useState } from 'react';
import { WMSApiAdapter } from '../adapters/wmsApiAdapter';
import { ReceivingOrder, PalletSSCC, StockPosition } from '../types/wms';
import {
  INITIAL_RECEIVING_ORDERS,
  INITIAL_PALLETS,
  INITIAL_STOCK
} from '../data/mockData';

export function useWMSData() {
  const [orders, setOrders] = useState<ReceivingOrder[]>(INITIAL_RECEIVING_ORDERS);
  const [pallets, setPallets] = useState<PalletSSCC[]>(INITIAL_PALLETS);
  const [stock, setStock] = useState<StockPosition[]>(INITIAL_STOCK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Tenta buscar dados reais; fallback para mock
        const [ordersData, palletsData, stockData] = await Promise.allSettled([
          WMSApiAdapter.getOrders(),
          WMSApiAdapter.getPallets(),
          WMSApiAdapter.getStockData()
        ]);

        if (ordersData.status === 'fulfilled' && ordersData.value.length > 0) {
          setOrders(ordersData.value);
        }

        if (palletsData.status === 'fulfilled' && palletsData.value.length > 0) {
          setPallets(palletsData.value);
        }

        if (stockData.status === 'fulfilled' && stockData.value.length > 0) {
          setStock(stockData.value);
        }

        setError(null);
      } catch (err) {
        console.warn('WMS API não respondeu, usando mock data');
        setError('Usando dados de teste (API offline)');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // Poll a cada 30 segundos
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  return { orders, pallets, stock, loading, error, setOrders, setPallets, setStock };
}
