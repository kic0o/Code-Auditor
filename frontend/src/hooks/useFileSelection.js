import { useState, useMemo } from 'react';
import { ANALYSIS_CATEGORIES, createEmptyCategorySelection, REVIEW_UPLOAD_CONFIG } from '../constants/analysisConfig';

export function useFileSelection() {
  const [repoFiles, setRepoFiles] = useState([]);
  const [selectedFileMatrix, setSelectedFileMatrix] = useState(createEmptyCategorySelection);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const selectedFilesCount = useMemo(() => {
    const u = new Set();
    ANALYSIS_CATEGORIES.forEach(c => selectedFileMatrix[c.id].forEach(p => u.add(p)));
    return u.size;
  }, [selectedFileMatrix]);

  const totalSelectionsCount = useMemo(() =>
    ANALYSIS_CATEGORIES.reduce((t, c) => t + selectedFileMatrix[c.id].size, 0),
  [selectedFileMatrix]);

  const categorySelectionCounts = useMemo(() =>
    ANALYSIS_CATEGORIES.reduce((acc, c) => { acc[c.id] = selectedFileMatrix[c.id].size; return acc; }, {}),
  [selectedFileMatrix]);

  const toggleCategorySelection = (path, catId) => {
    setSelectedFileMatrix(prev => {
      const u = { ...prev, [catId]: new Set(prev[catId]) };
      u[catId].has(path) ? u[catId].delete(path) : u[catId].add(path);
      return u;
    });
  };

  const selectAllForCategory = (catId) =>
    setSelectedFileMatrix(prev => ({ ...prev, [catId]: new Set(repoFiles.map(f => f.path)) }));

  const clearCategory = (catId) =>
    setSelectedFileMatrix(prev => ({ ...prev, [catId]: new Set() }));

  const selectFileForAllCategories = (path) =>
    setSelectedFileMatrix(prev => {
      const u = { ...prev };
      ANALYSIS_CATEGORIES.forEach(c => { u[c.id] = new Set(prev[c.id]); u[c.id].add(path); });
      return u;
    });

  const clearFileFromAllCategories = (path) =>
    setSelectedFileMatrix(prev => {
      const u = { ...prev };
      ANALYSIS_CATEGORIES.forEach(c => { u[c.id] = new Set(prev[c.id]); u[c.id].delete(path); });
      return u;
    });

  const processDroppedFiles = (incomingFiles, setError) => {
    const files = Array.from(incomingFiles || []);
    if (!files.length) return;
    
    const valid = files.filter(f =>
      REVIEW_UPLOAD_CONFIG.documentation.allowedExtensions.includes(f.name.split('.').pop()?.toLowerCase() || '')
    );
    
    if (!valid.length) { setError("No se detectaron archivos válidos."); return; }
    setError(null);
    
    // 🔥 CAMBIO CRÍTICO: Ahora guardamos la propiedad "file: f" que contiene el binario
    const newDocs = valid.map(f => ({ file: f, name: f.name, status: 'processing' }));
    
    setUploadedDocs(prev => [...prev, ...newDocs]);
    setTimeout(() => {
      setUploadedDocs(curr =>
        curr.map(d => valid.find(v => v.name === d.name) && d.status === 'processing' ? { ...d, status: 'processed' } : d)
      );
    }, 1200);
  };

  const removeDoc = (i) => setUploadedDocs(prev => prev.filter((_, idx) => idx !== i));

  const resetFileSelection = () => {
    setRepoFiles([]);
    setSelectedFileMatrix(createEmptyCategorySelection());
    setUploadedDocs([]);
  };

  return {
    repoFiles, setRepoFiles,
    selectedFileMatrix, setSelectedFileMatrix,
    uploadedDocs,
    isDraggingFiles, setIsDraggingFiles,
    selectedFilesCount,
    totalSelectionsCount,
    categorySelectionCounts,
    toggleCategorySelection,
    selectAllForCategory,
    clearCategory,
    selectFileForAllCategories,
    clearFileFromAllCategories,
    processDroppedFiles,
    removeDoc,
    resetFileSelection,
  };
}
