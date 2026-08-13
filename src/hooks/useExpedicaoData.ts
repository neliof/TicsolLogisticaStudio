import { useEffect, useState } from 'react';
import { GuiaTransporte, PaletaExpedicao, ComprovanteEmbarque } from '../types/expedicao';
import { INITIAL_GUIAS_TRANSPORTE, INITIAL_PALETAS_EXPEDICAO, INITIAL_COMPROVANTES_EMBARQUE } from '../data/mockExpedicao';

export function useExpedicaoData() {
  const [guias, setGuias] = useState<GuiaTransporte[]>(INITIAL_GUIAS_TRANSPORTE);
  const [paletas, setPaletas] = useState<PaletaExpedicao[]>(INITIAL_PALETAS_EXPEDICAO);
  const [comprovantes, setComprovantes] = useState<ComprovanteEmbarque[]>(INITIAL_COMPROVANTES_EMBARQUE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Tenta buscar dados reais da API; fallback para mock
        const endpoints = [
          { url: 'http://localhost:3000/rest/v1/guia_transporte', setState: setGuias },
          { url: 'http://localhost:3000/rest/v1/palete_expedicao', setState: setPaletas },
          { url: 'http://localhost:3000/rest/v1/comprovante_embarque', setState: setComprovantes }
        ];

        for (const endpoint of endpoints) {
          try {
            const res = await fetch(endpoint.url);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
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

  return { pedidos: guias, paletas, guias: comprovantes, loading, error, setPedidos: setGuias, setPaletas, setGuias: setComprovantes };
}
