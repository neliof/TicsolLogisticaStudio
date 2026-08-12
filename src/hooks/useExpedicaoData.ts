import { useEffect, useState } from 'react';
import { PedidoCompra, PaletaExpedicao, GuiaTransporte } from '../types/expedicao';
import { INITIAL_PEDIDOS_COMPRA, INITIAL_PALETAS_EXPEDICAO, INITIAL_GUIAS_TRANSPORTE } from '../data/mockExpedicao';

export function useExpedicaoData() {
  const [pedidos, setPedidos] = useState<PedidoCompra[]>(INITIAL_PEDIDOS_COMPRA);
  const [paletas, setPaletas] = useState<PaletaExpedicao[]>(INITIAL_PALETAS_EXPEDICAO);
  const [guias, setGuias] = useState<GuiaTransporte[]>(INITIAL_GUIAS_TRANSPORTE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Tenta buscar dados reais; fallback para mock
        const endpoints = [
          { url: 'http://localhost:3000/rest/v1/pedido_compra', setState: setPedidos },
          { url: 'http://localhost:3000/rest/v1/palete_expedicao', setState: setPaletas },
          { url: 'http://localhost:3000/rest/v1/guia_transporte', setState: setGuias }
        ];

        for (const endpoint of endpoints) {
          try {
            const res = await fetch(endpoint.url);
            if (res.ok) {
              const data = await res.json();
              if (data.length > 0) {
                endpoint.setState(data);
              }
            }
          } catch (e) {
            console.warn(`Endpoint ${endpoint.url} offline, usando mock`);
          }
        }

        setError(null);
      } catch (err) {
        console.warn('Expedição API offline, usando mock data');
        setError('Usando dados simulação (API offline)');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // Poll a cada 30 segundos
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  return { pedidos, paletas, guias, loading, error, setPedidos, setPaletas, setGuias };
}
