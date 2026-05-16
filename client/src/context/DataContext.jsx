/**
 * DataContext — loads data by parsing Excel files in the browser.
 *
 * Flow:
 *  1. needsFiles = true → FileLoader (file-picker dialog) appears.
 *  2. User selects their three Excel files → loadFromFiles() runs.
 *  3. browserExcelReader.js processes each file client-side (no server).
 *  4. Raw rows are stored in rawDataStore for the Widget Builder.
 *  5. Processed metrics flow to dashboards via delivery / qa state.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { processDelivery, processQA } from '../services/browserExcelReader';
import { rawDataStore } from '../lib/rawDataStore';
import * as XLSX from 'xlsx';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [delivery,   setDelivery]   = useState(null);
  const [qa,         setQA]         = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [needsFiles, setNeedsFiles] = useState(true);

  const loadFromFiles = useCallback(async ({ deliveryFile, bugsFile, escapingFile, settings = {} }) => {
    if (!deliveryFile && !bugsFile) {
      setError('Please select at least the Delivery file.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [dData, qData] = await Promise.all([
        deliveryFile ? processDelivery(deliveryFile, settings) : null,
        (bugsFile || escapingFile) ? processQA(bugsFile, escapingFile || bugsFile, settings) : null,
      ]);

      // Store raw rows in memory for Widget Builder
      if (deliveryFile) {
        const buf = await deliveryFile.arrayBuffer();
        const wb  = XLSX.read(new Uint8Array(buf), { type: 'array' });
        rawDataStore.set('delivery', {
          rows:   XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }),
          sheets: wb.SheetNames,
          wb,
        });
      }
      if (bugsFile) {
        const buf = await bugsFile.arrayBuffer();
        const wb  = XLSX.read(new Uint8Array(buf), { type: 'array' });
        rawDataStore.set('qa_bugs', {
          rows: XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }),
        });
      }
      if (escapingFile) {
        const buf = await escapingFile.arrayBuffer();
        const wb  = XLSX.read(new Uint8Array(buf), { type: 'array' });
        rawDataStore.set('qa_escaping', {
          rows: XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }),
        });
      }

      if (dData) setDelivery(dData);
      if (qData) setQA(qData);
      setNeedsFiles(false);
    } catch (e) {
      setError(e.message || 'Failed to parse Excel files.');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setDelivery(null);
    setQA(null);
    setNeedsFiles(true);
    setError(null);
    rawDataStore.clear();
  }, []);

  const skipFiles  = useCallback(() => { setNeedsFiles(false); setError(null); }, []);
  const openLoader = useCallback(() => { setNeedsFiles(true);  setError(null); }, []);

  return (
    <DataContext.Provider value={{
      delivery, qa, loading, error, needsFiles,
      loadFromFiles,
      loadFiles: openLoader,   // sidebar "Reload Data" triggers the dialog
      clearData, skipFiles, openLoader,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
