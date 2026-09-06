import { useCallback, useEffect, useState } from 'react';
import { GuiaTransporte, LinhaGuia, PaletaExpedicao, ComprovanteEmbarque } from '../types/expedicao';
import { api } from '../api';

/** Mapeia uma linha_documento do ARTSOFT para LinhaGuia. */
function linhaDocParaLinhaGuia(l: any, guiaId: string): LinhaGuia {
  const extra = l.dados_extra || {};
  return {
    id: `${guiaId}-${l.nr_linha ?? l.id}`,
    guia_id: guiaId,
    artigo_codigo: l.artigo_codigo || '',
    artigo_descricao: l.descricao || '',
    ean_barcode: extra.ean13 || '',
    quantidade_solicitada: Number(l.quantidade) || 0,
    lote: '',
    data_validade: '',
    temperatura_armazenamento: 'AMBIENTE',
    requer_palote_separada: false,
    peso_unitario_kg: Number(extra.peso) || 0,
    volume_unitario_m3: 0,
    status: 'PENDENTE',
  };
}

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

  // Carrega as linhas de uma guia só quando é preciso (ao abri-la). Guias já
  // com linhas não voltam a ser pedidas.
  const carregarLinhas = useCallback(
    async (guiaId: string) => {
      const guia = guias.find((g) => g.id === guiaId);
      if (!guia || guia.linhas.length > 0) return;
      try {
        const linhas = await api.listarLinhasDoDocumento(guiaId);
        setGuias((prev) =>
          prev.map((g) =>
            g.id === guiaId ? { ...g, linhas: linhas.map((l) => linhaDocParaLinhaGuia(l, guiaId)) } : g
          )
        );
      } catch {
        // Sem detalhe de linhas: a guia fica com a lista vazia, sem quebrar o ecrã.
      }
    },
    [guias]
  );

  return {
    pedidos: guias,
    carregarLinhas,
    paletas,
    guias: comprovantes,
    loading,
    error,
    setPedidos: setGuias,
    setPaletas,
    setGuias: setComprovantes,
  };
}
