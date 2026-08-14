import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { CompilationResult } from '../types/label';

interface LabelPreviewProps {
  compilationResult: CompilationResult;
  paperSize: { width: number; height: number };
  onAdjustSize?: () => void;
}

export const LabelPreview: React.FC<LabelPreviewProps> = ({
  compilationResult,
  paperSize,
  onAdjustSize,
}) => {
  const [currentPage, setCurrentPage] = useState(0);

  const hasMultiplePages = compilationResult.pages > 1;
  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < compilationResult.pages - 1;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
      {/* Title */}
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Pré-visualização da Etiqueta</h3>

      {/* Status Message */}
      <div className={`mb-4 p-3 rounded-lg border ${
        compilationResult.status === 'warning'
          ? 'bg-amber-50 border-amber-200'
          : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-start gap-2">
          {compilationResult.status === 'warning' && (
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-sm font-medium ${
            compilationResult.status === 'warning'
              ? 'text-amber-800'
              : 'text-green-800'
          }`}>
            {compilationResult.message || 'Pronto para imprimir'}
          </p>
        </div>
      </div>

      {/* Preview Canvas */}
      <div className="bg-white border-2 border-slate-300 rounded-lg p-4 mb-4 relative"
           style={{
             aspectRatio: `${paperSize.width} / ${paperSize.height}`,
             maxWidth: '100%',
           }}>
        <div className="text-center text-slate-500 text-sm h-full flex items-center justify-center">
          {compilationResult.preview ? (
            <img
              src={compilationResult.preview}
              alt={`Página ${currentPage + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div>
              <p className="font-mono text-xs text-slate-400">
                Dimensões: {paperSize.width}×{paperSize.height}mm
              </p>
              <p className="text-xs text-slate-400 mt-2">ZPL Preview</p>
            </div>
          )}
        </div>
      </div>

      {/* Page Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-600">
          Página <span className="font-semibold">{currentPage + 1}</span> de{' '}
          <span className="font-semibold">{compilationResult.pages}</span>
        </div>

        {hasMultiplePages && (
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={!canGoPrev}
              className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(compilationResult.pages - 1, p + 1))}
              disabled={!canGoNext}
              className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Adjust Size Button */}
      {onAdjustSize && (
        <button
          onClick={onAdjustSize}
          className="w-full py-2 px-4 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          Ajustar Tamanho do Papel
        </button>
      )}
    </div>
  );
};
