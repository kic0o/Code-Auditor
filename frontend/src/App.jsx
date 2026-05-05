import { useState } from 'react';
import { Github } from 'lucide-react'; // Añadido el icono para la pantalla de carga
import { useGithubAuth } from './hooks/useGithubAuth';
import { useFileSelection } from './hooks/useFileSelection';
import { useAnalysis } from './hooks/useAnalysis';
import { getRepoFiles } from './services/api';
import { ANALYSIS_CATEGORIES } from './constants/analysisConfig';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import WizardBar from './components/layout/WizardBar';
import Step1View from './components/views/Step1View';
import PrivateRepoAuthView from './components/views/PrivateRepoAuthView';
import Step2View from './components/views/Step2View';
import ResultsView from './components/views/ResultsView';

function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [wizardStep, setWizardStep] = useState(1);
  const [view, setView] = useState('setup');
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState(null);
  const [currentlyAnalyzingCategory, setCurrentlyAnalyzingCategory] = useState('');

  const auth = useGithubAuth();
  const files = useFileSelection();
  const analysis = useAnalysis();

  const handleConnect = async () => {
    if (!repoUrl) { alert('⚠️ Por favor, ingresa una URL de GitHub primero.'); return; }
    setLoadingFiles(true); setError(null);
    try {
      const data = await getRepoFiles(repoUrl);
      const lista = data.files || data.archivos || [];
      const mapeados = lista.map(a => {
        const filePath = typeof a === 'string' ? a : a.path;
        const parts = filePath.split('.');
        const extensionSegura = parts.length > 1 ? `.${parts.pop()}` : '.txt';
        return { path: filePath, extension: extensionSegura };
      });
      
      files.resetFileSelection();
      files.setRepoFiles(mapeados);
      auth.setShowPrivateRepoAuth(false);
      setWizardStep(2);
    } catch (err) {
      if (auth.shouldShowPrivateRepoAuth(err.status, err.payload)) {
        auth.setShowPrivateRepoAuth(true);
        return;
      }
      setError('No se pudo conectar con el backend o el repositorio no existe.');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleReset = () => {
    setView('setup'); setWizardStep(1); setRepoUrl('');
    setError(null);
    files.resetFileSelection();
    analysis.resetAnalysis();
  };

  const startAnalysis = () => {
    analysis.startAnalysis(
      files.selectedFileMatrix, repoUrl,
      setView, setCurrentlyAnalyzingCategory, setWizardStep,
      files.uploadedDocs // Pasando los documentos subidos
    );
  };

  const advanceToNextCategory = () => {
    analysis.advanceToNextCategory(
      files.selectedFileMatrix, repoUrl,
      setView, setCurrentlyAnalyzingCategory,
      files.uploadedDocs // Pasando los documentos subidos
    );
  };

  const enviarDecisionesAlBackend = () => {
    analysis.enviarDecisionesAlBackend(
      repoUrl, auth.userGithubToken,
      auth.setShowPrivateRepoAuth, handleReset
    );
  };

  const currentReviewCategory = ANALYSIS_CATEGORIES[analysis.currentReviewIndex];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <Header userGithubToken={auth.userGithubToken} />
      <WizardBar currentStep={wizardStep} />

      <main className="flex-1 px-8 py-10 flex flex-col">
        
        {/* 🔥 PANTALLA DE CARGA RESTAURADA 🔥 */}
        {view === 'analyzing' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in zoom-in duration-500">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Github className="text-blue-600 animate-pulse" size={32} />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-6xl font-black text-slate-800 tracking-tight italic transition-all">
                Analizando {currentlyAnalyzingCategory}...
              </h2>
              <p className="text-slate-400 mt-4 font-medium text-lg">Por favor espera, conectando con Azure por lotes.</p>
            </div>
          </div>
        )}

        {view === 'setup' && auth.showPrivateRepoAuth && (
          <PrivateRepoAuthView
            githubAuthorized={auth.githubAuthorized}
            repoAccessMessage={auth.repoAccessMessage}
            repoUrl={repoUrl}
            setRepoUrl={setRepoUrl}
            handleConnect={handleConnect}
            loadingFiles={loadingFiles}
            error={error}
            setShowPrivateRepoAuth={auth.setShowPrivateRepoAuth}
          />
        )}

        {view === 'setup' && !auth.showPrivateRepoAuth && wizardStep === 1 && (
          <Step1View
            repoUrl={repoUrl}
            setRepoUrl={setRepoUrl}
            handleConnect={handleConnect}
            loadingFiles={loadingFiles}
            error={error}
            userGithubToken={auth.userGithubToken}
            setShowPrivateRepoAuth={auth.setShowPrivateRepoAuth}
          />
        )}

        {view === 'setup' && wizardStep === 2 && (
          <Step2View
            repoUrl={repoUrl}
            handleReset={handleReset}
            repoFiles={files.repoFiles}
            error={error}
            selectedFilesCount={files.selectedFilesCount}
            totalSelectionsCount={files.totalSelectionsCount}
            categorySelectionCounts={files.categorySelectionCounts}
            selectedFileMatrix={files.selectedFileMatrix}
            toggleCategorySelection={files.toggleCategorySelection}
            selectAllForCategory={files.selectAllForCategory}
            clearCategory={files.clearCategory}
            selectFileForAllCategories={files.selectFileForAllCategories}
            clearFileFromAllCategories={files.clearFileFromAllCategories}
            uploadedDocs={files.uploadedDocs}
            isDraggingFiles={files.isDraggingFiles}
            setIsDraggingFiles={files.setIsDraggingFiles}
            processDroppedFiles={files.processDroppedFiles}
            removeDoc={files.removeDoc}
            startAnalysis={startAnalysis}
            setError={setError}
          />
        )}

        {/* Resultados */}
        {view === 'results' && (
          <ResultsView
            analysisResult={analysis.analysisResult}
            currentReviewIndex={analysis.currentReviewIndex}
            currentReviewCategory={currentReviewCategory}
            findingsByCategory={analysis.findingsByCategory}
            findingDecisions={analysis.findingDecisions}
            categoryStats={analysis.categoryStats}
            reportStats={analysis.reportStats}
            isCategoryCompleted={analysis.isCategoryCompleted}
            reviewCompleted={analysis.reviewCompleted}
            selectedFileMatrix={files.selectedFileMatrix}
            toggleFindingDecision={analysis.toggleFindingDecision}
            advanceToNextCategory={advanceToNextCategory}
            handleReset={handleReset}
            enviarDecisionesAlBackend={enviarDecisionesAlBackend}
            isSendingToBackend={analysis.isSendingToBackend}
            getFindingId={analysis.getFindingId}
            allFindings={analysis.allFindings} 
            setCurrentReviewIndex={analysis.setCurrentReviewIndex}
          />
        )}
      </main>

      <Footer />
      {/* 🔥 ESTILOS DE SCROLLBAR RESTAURADOS 🔥 */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </div>
  );
}

export default App;