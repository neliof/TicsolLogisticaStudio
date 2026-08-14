import { useMemo, useState, useCallback, ReactNode } from 'react';
import { LabelData, Label, CompactedLabel, CompactState, CompilationResult } from '../types/label';

const DPI = 203;
const DOTS_PER_MM = 8;

function mmToDots(mm: number): number {
  return Math.round(mm * DOTS_PER_MM);
}

function estimateLabelHeightMm(content: ReactNode, compactState: CompactState): number {
  // Approximate height based on:
  // - Header: ~15mm
  // - Section per product: ~20mm
  // - Barcode: 5-10mm depending on height
  // - Footer/spacing: ~10mm

  const baseHeight = 15;
  const barcodeHeightMm = compactState.barcodeHeight * 0.3;  // Rough conversion
  const footerHeight = 10;

  return baseHeight + barcodeHeightMm + footerHeight;
}

function getCompactState(iteration: 0 | 1 | 2 | 3): CompactState {
  const states: Record<0 | 1 | 2 | 3, CompactState> = {
    0: { fontSize: 25, barcodeHeight: 50, marginPx: 50, sectionPadding: 2, iteration: 0 },
    1: { fontSize: 20, barcodeHeight: 40, marginPx: 30, sectionPadding: 2, iteration: 1 },
    2: { fontSize: 16, barcodeHeight: 30, marginPx: 15, sectionPadding: 1, iteration: 2 },
    3: { fontSize: 16, barcodeHeight: 30, marginPx: 15, sectionPadding: 1, iteration: 3 },
  };
  return states[iteration];
}

function SingleProductLabel(data: LabelData, compactState: CompactState): ReactNode {
  return `Single Product Label (iteration ${compactState.iteration})`;
}

function PackingListLabel(data: LabelData, products: any[], compactState: CompactState): ReactNode {
  return `Packing List Label (${products.length} products, iteration ${compactState.iteration})`;
}

export function useZebraLabel() {
  const [compactIteration, setCompactIteration] = useState<0 | 1 | 2 | 3>(0);

  // Calculate pages needed for label data
  const calculatePages = useCallback((
    labelData: LabelData,
    paperHeightMm: number,
    productList?: any[]
  ): { pages: Label[]; totalPages: number; overflow: boolean } => {
    const compactState = getCompactState(compactIteration);
    const products = productList || labelData.products || [];

    // For single labels (no packing list)
    if (labelData.type === 'single' || !products.length) {
      const estimatedHeight = estimateLabelHeightMm(
        labelData.pallet.artigo_descricao,
        compactState
      );

      return {
        pages: [
          {
            id: '0',
            order: 0,
            content: SingleProductLabel(labelData, compactState),
            compactState,
            estimatedHeightMm: estimatedHeight,
          },
        ],
        totalPages: 1,
        overflow: estimatedHeight > paperHeightMm,
      };
    }

    // For packing lists: chunk products across pages
    const pages: Label[] = [];
    let currentPageProducts: any[] = [];
    let currentPageHeight = 0;
    let pageOrder = 0;

    const headerFooterHeightMm = 20;  // Approx header + footer
    const availableHeightMm = paperHeightMm - headerFooterHeightMm;

    for (const product of products) {
      const productHeightMm = 25;  // Each product ~25mm

      if (currentPageHeight + productHeightMm > availableHeightMm && currentPageProducts.length > 0) {
        // Start new page
        pages.push({
          id: `page-${pageOrder}`,
          order: pageOrder,
          content: PackingListLabel(labelData, currentPageProducts, compactState),
          compactState,
          estimatedHeightMm: currentPageHeight + headerFooterHeightMm,
        });
        currentPageProducts = [product];
        currentPageHeight = productHeightMm;
        pageOrder++;
      } else {
        currentPageProducts.push(product);
        currentPageHeight += productHeightMm;
      }
    }

    // Add final page
    if (currentPageProducts.length > 0) {
      pages.push({
        id: `page-${pageOrder}`,
        order: pageOrder,
        content: PackingListLabel(labelData, currentPageProducts, compactState),
        compactState,
        estimatedHeightMm: currentPageHeight + headerFooterHeightMm,
      });
    }

    const hasOverflow = pages.some(p => p.estimatedHeightMm > paperHeightMm);

    return {
      pages,
      totalPages: pages.length,
      overflow: hasOverflow,
    };
  }, [compactIteration]);

  // Compact label to fit within target height
  const compactLabel = useCallback((
    targetHeightMm: number,
    maxIterations: number = 3
  ): boolean => {
    if (compactIteration < maxIterations) {
      setCompactIteration((prev) => Math.min(prev + 1, maxIterations) as 0 | 1 | 2 | 3);
      return true;
    }
    return false;
  }, [compactIteration]);

  // Generate ZPL for label (stub — backend will do actual ZPL)
  const generateZPL = useCallback((label: Label): string => {
    // This is a stub; actual ZPL generation happens on backend
    return `^XA^MMT^PW832^LL406^LS0^FTLabel${label.order}^FS^XZ`;
  }, []);

  return {
    calculatePages,
    compactLabel,
    generateZPL,
    currentIteration: compactIteration,
    setCompactIteration,
  };
}
