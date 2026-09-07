import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

interface ConfigureSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const ConfigureSeriesModal: React.FC<ConfigureSeriesModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [discovering, setDiscovering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableSeries, setAvailableSeries] = useState<string[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');

  useEffect(() => {
    if (isOpen && availableSeries.length === 0) {
      discoverSeries();
    }
  }, [isOpen]);

  const discoverSeries = async () => {
    try {
      setDiscovering(true);
      setError(null);
      const response = await api.discover_artsoft_series();
      setAvailableSeries(response.series || []);
      if (response.series.length === 0) {
        setError('Nenhuma série descoberta. Pode introduzir manualmente abaixo.');
      }
    } catch (err) {
      setError(`Erro ao descobrir séries: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      setAvailableSeries([]);
    } finally {
      setDiscovering(false);
    }
  };

  const handleToggleSeries = (serie: string) => {
    setSelectedSeries((prev) =>
      prev.includes(serie) ? prev.filter((s) => s !== serie) : [...prev, serie]
    );
  };

  const handleAddManual = () => {
    const cleaned = manualInput.trim().toUpperCase();
    if (cleaned && !selectedSeries.includes(cleaned) && !availableSeries.includes(cleaned)) {
      setAvailableSeries((prev) => [...prev, cleaned].sort());
      setSelectedSeries((prev) => [...prev, cleaned]);
      setManualInput('');
    }
  };

  const handleSave = async () => {
    if (selectedSeries.length === 0) {
      setError('Selecione pelo menos uma série.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await api.save_artsoft_series({ series: selectedSeries });
      setSuccess(`Séries gravadas: ${selectedSeries.join(';')}`);
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(`Erro ao gravar séries: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Configurar séries de guias</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Discover button */}
          <button
            onClick={discoverSeries}
            disabled={discovering}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-all disabled:opacity-50"
          >
            {discovering ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {discovering ? 'A descobrir…' : 'Descobrir séries'}
          </button>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-lg text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Available series */}
          {availableSeries.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Séries disponíveis:
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableSeries.map((serie) => (
                  <label key={serie} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSeries.includes(serie)}
                      onChange={() => handleToggleSeries(serie)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">{serie}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Manual input */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Introduzir manualmente:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddManual();
                }}
                placeholder="ex: V960"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddManual}
                disabled={!manualInput.trim()}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold text-sm rounded-lg transition-all disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Selected series summary */}
          {selectedSeries.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-900">
                Séries selecionadas ({selectedSeries.length}):
              </p>
              <p className="text-sm text-blue-800 mt-1 font-mono">{selectedSeries.join(';')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-5 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold text-sm rounded-lg transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selectedSeries.length === 0}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-all disabled:opacity-50"
          >
            {saving ? 'A gravar…' : 'Gravar'}
          </button>
        </div>
      </div>
    </div>
  );
};
