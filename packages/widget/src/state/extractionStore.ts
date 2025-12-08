/**
 * Extraction Store - Zustand store for managing extracted medical fields
 */

import { create } from 'zustand';
import type { ExtractedField, ExtractionResult } from '../types';

interface ExtractionState {
  // State
  extractions: ExtractionResult[];
  currentExtraction: ExtractionResult | null;
  allExtractedFields: Map<string, ExtractedField>;
  extractionError: string | null;
  isExtracting: boolean;

  // Actions
  addExtraction: (extraction: ExtractionResult) => void;
  setCurrentExtraction: (extraction: ExtractionResult | null) => void;
  setExtractionError: (error: string | null) => void;
  setIsExtracting: (isExtracting: boolean) => void;
  updateField: (field: ExtractedField) => void;
  getFieldValue: (fieldName: string) => ExtractedField | undefined;
  getAllFields: () => ExtractedField[];
  reset: () => void;
}

export const useExtractionStore = create<ExtractionState>((set, get) => ({
  // Initial state
  extractions: [],
  currentExtraction: null,
  allExtractedFields: new Map(),
  extractionError: null,
  isExtracting: false,

  // Actions
  addExtraction: (extraction) =>
    set((state) => {
      // Merge new fields into allExtractedFields, keeping higher confidence
      const newFields = new Map(state.allExtractedFields);
      for (const field of extraction.fields) {
        const existing = newFields.get(field.fieldName);
        if (!existing || field.confidence > existing.confidence) {
          newFields.set(field.fieldName, field);
        }
      }

      return {
        extractions: [...state.extractions, extraction],
        currentExtraction: extraction,
        allExtractedFields: newFields,
        isExtracting: false,
      };
    }),

  setCurrentExtraction: (extraction) =>
    set({ currentExtraction: extraction }),

  setExtractionError: (error) =>
    set({ extractionError: error, isExtracting: false }),

  setIsExtracting: (isExtracting) =>
    set({ isExtracting }),

  updateField: (field) =>
    set((state) => {
      const newFields = new Map(state.allExtractedFields);
      newFields.set(field.fieldName, field);
      return { allExtractedFields: newFields };
    }),

  getFieldValue: (fieldName) => {
    return get().allExtractedFields.get(fieldName);
  },

  getAllFields: () => {
    return Array.from(get().allExtractedFields.values());
  },

  reset: () =>
    set({
      extractions: [],
      currentExtraction: null,
      allExtractedFields: new Map(),
      extractionError: null,
      isExtracting: false,
    }),
}));
