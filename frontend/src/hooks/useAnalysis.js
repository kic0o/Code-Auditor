import { useState, useMemo } from 'react';
import { ANALYSIS_CATEGORIES, FINAL_REVIEW_STEP, getWizardStepForReviewIndex } from '../constants/analysisConfig';
import { analyzeStep, applyPatches } from '../services/api';

export function useAnalysis() {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [fetchedCategories, setFetchedCategories] = useState(new Set());
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [findingDecisions, setFindingDecisions] = useState({});
  const [isSendingToBackend, setIsSendingToBackend] = useState(false);

  const getFindingId = (finding, index) => `${finding.file_path}-${finding.type}-${index}`;

  const allFindings = useMemo(() => {
    const raw = analysisResult?.findings || [];
    return raw.map(f => ({
      ...f,
      file_path: f.file_path || f.file || f.archivo || 'Global/Multiple',
      description: f.description || f.sugerencia || f.explanation || 'Revisar código.',
      recommendation: f.recommendation || f.sugerencia || 'Sugerencia no proporcionada.',
      original_code: f.original_code || f.codigo_original || '',
      secure_code: f.secure_code || f.codigo_corregido || '',
      type: f.type || 'business_rules',
      severity: 'critical',
    }));
  }, [analysisResult]);

  const findingsByCategory = useMemo(() => {
    const empty = ANALYSIS_CATEGORIES.reduce((acc, c) => { acc[c.id] = []; return acc; }, {});
    if (allFindings.length === 0) return empty;
    return allFindings.reduce((acc, f) => {
      if (acc[f.type]) acc[f.type].push(f);
      return acc;
    }, empty);
  }, [allFindings]);

  const categoryStats = useMemo(() =>
    ANALYSIS_CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = { total: (findingsByCategory[cat.id] || []).length };
      return acc;
    }, {}),
  [findingsByCategory]);

  const reportStats = useMemo(() => {
    if (allFindings.length === 0) return { affectedFiles: 0, affectedPct: 0 };
    const affectedFiles = new Set(allFindings.map(f => f.file_path).filter(Boolean)).size;
    const totalFiles = analysisResult?.total_files || 1;
    return { affectedFiles, affectedPct: Math.round((affectedFiles / totalFiles) * 100) };
  }, [allFindings, analysisResult]);

  const isCategoryCompleted = (categoryId, selectedFileMatrix) => {
    if (selectedFileMatrix[categoryId].size === 0) return true;
    if (!fetchedCategories.has(categoryId)) return false;
    const findings = findingsByCategory[categoryId] || [];
    if (findings.length === 0) return true;
    return findings.every((f, i) => findingDecisions[getFindingId(f, i)] !== undefined);
  };

  const reviewCompleted = (selectedFileMatrix) => {
    const selectedCategories = ANALYSIS_CATEGORIES.filter(c => selectedFileMatrix[c.id].size > 0);
    if (selectedCategories.length === 0) return false;
    return selectedCategories.every(c => isCategoryCompleted(c.id, selectedFileMatrix));
  };

  const fetchCategoryData = async (index, selectedFileMatrix, repoUrl, setView, setCurrentlyAnalyzingCategory, uploadedDocs) => {
    const category = ANALYSIS_CATEGORIES[index];
    const filesForThisCat = Array.from(selectedFileMatrix[category.id]);
    setView('analyzing');
    setCurrentlyAnalyzingCategory(category.label);
    try {
      const data = await analyzeStep(
        analysisResult?.session_id,
        filesForThisCat,
        category.id,
        repoUrl,
        uploadedDocs
      );
      const normalized = (data.hallazgos || []).map(f => ({
        ...f,
        file_path: f.file || f.file_path || f.archivo || 'Global/Multiple',
        title: f.title || f.name || 'Hallazgo de ' + category.label,
        description: f.explanation || f.description || 'Revisar código.',
        recommendation: f.recommendation || f.sugerencia || 'Sugerencia no proporcionada.',
        original_code: f.original_code || f.codigo_original || '',
        secure_code: f.corrected_code || f.optimized_code || f.secure_code || '',
        type: category.id,
        sub_categoria: f.category || 'General',
        severity: f.severity || 'warning',
        line: f.line || null,
      }));
      setAnalysisResult(prev => ({
        session_id: data.session_id,
        total_files: (prev?.total_files || 0) + filesForThisCat.length,
        findings: [...(prev?.findings || []), ...normalized],
      }));
    } catch {
      alert(`🚨 Error del backend en ${category.label}`);
    }
    setFetchedCategories(prev => new Set(prev).add(category.id));
    setView('results');
  };

  const startAnalysis = async (selectedFileMatrix, repoUrl, setView, setCurrentlyAnalyzingCategory, setWizardStep, uploadedDocs) => {
    const firstIndex = ANALYSIS_CATEGORIES.findIndex(c => selectedFileMatrix[c.id].size > 0);
    if (firstIndex === -1) return;
    setAnalysisResult({ session_id: null, total_files: 0, findings: [] });
    setFetchedCategories(new Set());
    setFindingDecisions({});
    setCurrentReviewIndex(firstIndex);
    setWizardStep(getWizardStepForReviewIndex(firstIndex));
    await fetchCategoryData(firstIndex, selectedFileMatrix, repoUrl, setView, setCurrentlyAnalyzingCategory, uploadedDocs);
  };

  const advanceToNextCategory = async (selectedFileMatrix, repoUrl, setView, setCurrentlyAnalyzingCategory, setWizardStep, uploadedDocs) => {
    let nextIndex = currentReviewIndex + 1;
    while (nextIndex < ANALYSIS_CATEGORIES.length && selectedFileMatrix[ANALYSIS_CATEGORIES[nextIndex].id].size === 0) {
      nextIndex++;
    }
    if (nextIndex < ANALYSIS_CATEGORIES.length) {
      setCurrentReviewIndex(nextIndex);
      setWizardStep(getWizardStepForReviewIndex(nextIndex));
      const nextCatId = ANALYSIS_CATEGORIES[nextIndex].id;
      if (!fetchedCategories.has(nextCatId)) {
        await fetchCategoryData(nextIndex, selectedFileMatrix, repoUrl, setView, setCurrentlyAnalyzingCategory, uploadedDocs);
      }
    } else {
      setWizardStep(FINAL_REVIEW_STEP);
      setView('results');
    }
  };

  const toggleFindingDecision = (findingId, decision) => {
    setFindingDecisions(prev => ({ ...prev, [findingId]: prev[findingId] === decision ? undefined : decision }));
  };

  const enviarDecisionesAlBackend = async (repoUrl, userGithubToken, setShowPrivateRepoAuth, handleReset) => {
    const aceptados = [];
    ANALYSIS_CATEGORIES.forEach(cat => {
      (findingsByCategory[cat.id] || []).forEach((f, i) => {
        if (findingDecisions[getFindingId(f, i)] === 'accepted') aceptados.push(f);
      });
    });
    if (aceptados.length === 0) { alert('No aceptaste ningún cambio.'); return; }
    if (!userGithubToken) {
      alert('⚠️ Necesitas iniciar sesión con GitHub para poder crear el Pull Request.');
      setShowPrivateRepoAuth(true);
      return;
    }
    let repoPath = repoUrl.replace('https://github.com/', '').replace('.git', '');
    if (repoPath.endsWith('/')) repoPath = repoPath.slice(0, -1);
    setIsSendingToBackend(true);
    try {
      await applyPatches(analysisResult.session_id, aceptados, repoPath, userGithubToken);
      alert('¡Éxito! Los parches se aplicaron y el PR está en camino.');
      handleReset();
    } catch {
      alert('Error al enviar los cambios aceptados al backend.');
    } finally {
      setIsSendingToBackend(false);
    }
  };

  const resetAnalysis = () => {
    setAnalysisResult(null);
    setCurrentReviewIndex(0);
    setFindingDecisions({});
    setFetchedCategories(new Set());
  };

  return {
    analysisResult,
    fetchedCategories,
    currentReviewIndex,
    findingDecisions,
    isSendingToBackend,
    allFindings,
    findingsByCategory,
    categoryStats,
    reportStats,
    getFindingId,
    isCategoryCompleted,
    reviewCompleted,
    fetchCategoryData,
    startAnalysis,
    advanceToNextCategory,
    toggleFindingDecision,
    enviarDecisionesAlBackend,
    resetAnalysis,
    setCurrentReviewIndex,
  };
}
