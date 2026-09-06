import { useEffect, useState } from 'react';
import { GuiaTransporte, PaletaExpedicao, ComprovanteEmbarque } from '../types/expedicao';
import { api } from '../api';

/**
 * Mapeia um documento ARTSOFT (guia de transporte) para GuiaTransporte, ao
 * nível do cabeçalho. As linhas ficam vazias de propósito: carregá-las seria
 * uma chamada por guia (N+1). O detalhe de linhas é obtido só quando uma guia
 * é aberta, não no carregamento da lista.
 */
function docParaGuia(d: any): GuiaTransporte {
  const x =
    typeof d.conteudo_xml === 'string'
      ? (() => {
          try {
            return JSON.parse(d.conteudo_xml);
          } catch {
            return {};
          }
        })()
      : d.conteudo_xml || {};

  return {
    id: d.id,
    numero_guia: d.numero || d.origem_doc_id || '',
    cliente_nome: x.terceiro_nome || '',
    cliente_nif: x.terceiro_nif || '',
    morada_entrega: x.morada_descarga || '',
    cidade_entrega: '',
    codigo_postal_entrega: '',
    data_entrega_prevista: d.data_emissao || '',
    artsoft_order_id: x.pedido_origem || d.origem_doc_id || '',
    linhas: [],
    peso_total_estimado_kg: 0,
    volume_total_estimado_m3: 0,
    status: 'RECEBIDA',
    data_criacao: d.data_emissao || '',
    prioridade: 'NORMAL',
  };
}

export function useExpedicaoData() {
  const [guias, setGuias] = useState<GuiaTransporte[]>([]);
  // Sem tabelas próprias ainda: preenchidas pelo fluxo de expedição do WMS.
  const [paletas, setPaletas] = useState<PaletaExpedicao[]>([]);
  const [comprovantes, setComprovantes] = useState<ComprovanteEmbarque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const docs = await api.listarDocumentos(300);
        setGuias(docs.map(docParaGuia));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar guias de expedição.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    pedidos: guias,
    paletas,
    guias: comprovantes,
    loading,
    error,
    setPedidos: setGuias,
    setPaletas,
    setGuias: setComprovantes,
  };
}
