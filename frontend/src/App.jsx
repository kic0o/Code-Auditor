import React, { useState, useRef, useMemo } from 'react';
import { 
  Github, FileText, Upload, Search, ChevronRight, Folder, 
  CheckCircle, AlertCircle, ArrowLeft, Zap, ShieldAlert, Info, ExternalLink, X,
  Check
} from 'lucide-react';
 
// ── CONFIGURACIÓN ──────────────────────────────────────────────────────────
const REVIEW_UPLOAD_CONFIG = {
  documentation: {
    allowedExtensions: ['pdf', 'doc', 'docx', 'txt', 'md'],
  },
};
 
const ANALYSIS_CATEGORIES = [
  { id: 'business_rules', label: 'Reglas de negocio',   shortLabel: 'Negocio',   icon: FileText  },
  { id: 'security',       label: 'Seguridad',           shortLabel: 'Seguridad', icon: ShieldAlert },
  { id: 'best_practices', label: 'Buenas prácticas',    shortLabel: 'Prácticas', icon: Check     },
  { id: 'software_logic', label: 'Lógica del software', shortLabel: 'Lógica',    icon: Zap       },
];
 
const createEmptyCategorySelection = () =>
  ANALYSIS_CATEGORIES.reduce((acc, c) => { acc[c.id] = new Set(); return acc; }, {});
 
// ── WIZARD BAR EXTENDIDO (7 pasos) ────────────────────────────────────────
// Pasos: 1-Conectar, 2-Seleccionar, 3-Analizar, 4-Negocio, 5-Seguridad, 6-Prácticas, 7-Lógica
const WIZARD_STEPS = [
  { id: 1, label: 'Conectar',    icon: Github      },
  { id: 2, label: 'Seleccionar', icon: Folder      },
  { id: 3, label: 'Analizar',    icon: Zap         },
  { id: 4, label: 'Negocio',     icon: FileText    },
  { id: 5, label: 'Seguridad',   icon: ShieldAlert },
  { id: 6, label: 'Prácticas',   icon: Check       },
  { id: 7, label: 'Lógica',      icon: Zap         },
];
 
const WizardBar = ({ currentStep }) => (
  <div className="bg-white border-b border-slate-100 px-6 py-3">
    <div className="max-w-[1400px] mx-auto flex items-center justify-center">
      {WIZARD_STEPS.map((step, i) => {
        const Icon = step.icon;
        const isDone   = currentStep > step.id;
        const isActive = currentStep === step.id;
        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                isDone   ? 'bg-blue-600 shadow-sm shadow-blue-200' :
                isActive ? 'bg-[#0f172a] shadow-sm shadow-slate-300' : 'bg-slate-100'
              }`}>
                {isDone
                  ? <CheckCircle size={14} className="text-white" />
                  : <Icon size={12} className={isActive ? 'text-white' : 'text-slate-400'} />}
              </div>
              <div className="hidden sm:block">
                <p className={`text-[13px] font-black uppercase tracking-widest leading-none mb-0.5 ${
                  isDone ? 'text-blue-600' : isActive ? 'text-slate-800' : 'text-slate-400'
                }`}>Paso {step.id}</p>
                <p className={`text-[14px] font-semibold leading-none ${
                  isDone ? 'text-blue-500' : isActive ? 'text-slate-700' : 'text-slate-400'
                }`}>{step.label}</p>
              </div>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div className="flex items-center mx-2" style={{ minWidth: '20px', maxWidth: '60px', flex: 1 }}>
                <div className="w-full h-[2px] rounded-full overflow-hidden bg-slate-100">
                  <div className="h-full bg-blue-600 transition-all duration-500"
                    style={{ width: currentStep > step.id ? '100%' : '0%' }} />
                </div>
                <ChevronRight size={12} className={`flex-shrink-0 -ml-1 ${currentStep > step.id ? 'text-blue-400' : 'text-slate-200'}`} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);
 
// ── SCORE RING ─────────────────────────────────────────────────────────────
const ScoreRing = ({ score }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="112" height="112" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle cx="56" cy="56" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="text-center z-10">
        <span className="text-5xl font-black" style={{ color }}>{score}</span>
        <span className="text-base text-slate-400 block -mt-1">/100</span>
      </div>
    </div>
  );
};
 
// ── APP ────────────────────────────────────────────────────────────────────
const App = () => {
  const [view, setView] = useState('setup');
  const [wizardStep, setWizardStep] = useState(1);
 
  const [repoUrl, setRepoUrl] = useState('');
  const [repoFiles, setRepoFiles] = useState([]);
  const [selectedFileMatrix, setSelectedFileMatrix] = useState(createEmptyCategorySelection);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const fileInputRef = useRef(null);
 
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [findingDecisions, setFindingDecisions] = useState({});
  const [isSendingToBackend, setIsSendingToBackend] = useState(false);
 
  const getFindingId = (finding, index) => `${finding.file_path}-${finding.type}-${index}`;
 
  // ── MEMOS ──────────────────────────────────────────────────────────────
  const uniqueTypes = useMemo(() => {
    if (!analysisResult) return ['all'];
    return ['all', ...new Set(analysisResult.findings.map(f => f.type))];
  }, [analysisResult]);
 
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
 
  const normalizeFindingCategory = (finding) => {
    const direct = finding.category || finding.analysis_category || finding.review_category || finding.aspect;
    if (direct) return direct;
    const text = [finding.type, finding.title, finding.description, finding.recommendation].filter(Boolean).join(' ').toLowerCase();
    if (/(auth|token|xss|sql|csrf|secure|security|encrypt|vulnerab|injection)/.test(text)) return 'security';
    if (/(clean code|best practice|naming|refactor|readability|maintainab|standard|convention)/.test(text)) return 'best_practices';
    if (/(logic|workflow|algorithm|condition|branch|state|flow|business process)/.test(text)) return 'software_logic';
    return 'business_rules';
  };
 
  const findingsByCategory = useMemo(() => {
    const empty = ANALYSIS_CATEGORIES.reduce((acc, c) => { acc[c.id] = []; return acc; }, {});
    if (!analysisResult?.findings) return empty;
    return analysisResult.findings.reduce((acc, f) => {
      const cat = normalizeFindingCategory(f);
      const safe = ANALYSIS_CATEGORIES.some(c => c.id === cat) ? cat : 'business_rules';
      acc[safe].push(f);
      return acc;
    }, empty);
  }, [analysisResult]);
 
  // Estadísticas globales
  const reportStats = useMemo(() => {
    if (!analysisResult?.findings) return { critical: 0, warning: 0, info: 0, affectedFiles: 0, affectedPct: 0 };
    const findings = analysisResult.findings;
    const critical = findings.filter(f => f.severity === 'critical').length;
    const warning  = findings.filter(f => f.severity === 'warning').length;
    const info     = findings.filter(f => f.severity === 'info').length;
    const affectedFiles = new Set(findings.map(f => f.file_path).filter(Boolean)).size;
    const totalFiles = analysisResult.files_analyzed || 1;
    return { critical, warning, info, affectedFiles, affectedPct: Math.round((affectedFiles / totalFiles) * 100) };
  }, [analysisResult]);
 
  // Estadísticas por categoría
  const categoryStats = useMemo(() =>
    ANALYSIS_CATEGORIES.reduce((acc, cat) => {
      const findings = findingsByCategory[cat.id] || [];
      acc[cat.id] = {
        critical: findings.filter(f => f.severity === 'critical').length,
        warning:  findings.filter(f => f.severity === 'warning').length,
        info:     findings.filter(f => f.severity === 'info').length,
        total:    findings.length,
      };
      return acc;
    }, {}),
  [findingsByCategory]);
 
  const currentReviewCategory = ANALYSIS_CATEGORIES[currentReviewIndex];
 
  const currentCategoryFindings = useMemo(() => {
    if (!currentReviewCategory) return [];
    return findingsByCategory[currentReviewCategory.id].filter(f => {
      const matchSeverity = filterSeverity === 'all' || f.severity === filterSeverity;
      const matchType = filterType === 'all' || f.type === filterType;
      return matchSeverity && matchType;
    });
  }, [currentReviewCategory, findingsByCategory, filterSeverity, filterType]);
 
  const isCategoryCompleted = (categoryId) => {
    const findings = findingsByCategory[categoryId] || [];
    if (findings.length === 0) return true;
    return findings.every((f, i) => findingDecisions[getFindingId(f, i)] !== undefined);
  };
 
  const reviewCompleted = useMemo(() =>
    ANALYSIS_CATEGORIES.every(c => isCategoryCompleted(c.id)),
  [findingDecisions, findingsByCategory]);
 
  // ── HANDLERS ───────────────────────────────────────────────────────────
  const handleConnect = async () => {
    if (!repoUrl) { alert("⚠️ Por favor, ingresa una URL de GitHub primero."); return; }
    setLoadingFiles(true); setError(null);
    try {
      const response = await fetch("http://127.0.0.1:8000/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl, selected_files: [] }),
      });
      if (!response.ok) throw new Error(`Error ${response.status}`);
      const data = await response.json();
      const lista = data.files || data.archivos || [];
      const mapeados = lista.map(a => typeof a === 'string'
        ? { path: a, extension: `.${a.split('.').pop()}` }
        : { path: a.path, extension: a.extension });
      setRepoFiles(mapeados);
      setSelectedFileMatrix(createEmptyCategorySelection());
      setWizardStep(2);
    } catch (err) {
      setError("No se pudo conectar con el backend. Verifica que la URL sea válida.");
    } finally {
      setLoadingFiles(false);
    }
  };
 
  const startAnalysis = async () => {
    const byCategory = ANALYSIS_CATEGORIES.reduce((acc, c) => {
      acc[c.id] = Array.from(selectedFileMatrix[c.id]); return acc;
    }, {});
    const unique = Array.from(new Set(Object.values(byCategory).flat()));
    if (unique.length === 0) return;
    if (unique.length > 10) { setError(`Máximo 10 archivos (tienes ${unique.length}).`); return; }
    setView('analyzing'); setWizardStep(3); setError(null);
    try {
      const response = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl, selected_files: unique, selected_files_by_category: byCategory }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.detail || `Error ${response.status}`);
      }
      const data = await response.json();
      setAnalysisResult(data);
      setCurrentReviewIndex(0);
      setFindingDecisions({});
      setView('results');
      setWizardStep(4); // Entra a revisión de categoría 1
    } catch (err) {
      setError(`Error del backend: ${err.message}`);
      setView('setup'); setWizardStep(2);
    }
  };
 
  const handleReset = () => {
    setView('setup'); setWizardStep(1); setRepoFiles([]);
    setSelectedFileMatrix(createEmptyCategorySelection()); setRepoUrl('');
    setAnalysisResult(null); setUploadedDocs([]);
    setCurrentReviewIndex(0); setFindingDecisions({});
  };
 
  // Avanzar categoría de revisión → también avanza el wizard
  const advanceToNextCategory = () => {
    const next = currentReviewIndex + 1;
    if (next < ANALYSIS_CATEGORIES.length) {
      setCurrentReviewIndex(next);
      setWizardStep(4 + next); // pasos 4,5,6,7
    }
  };
 
  // Navegar a categoría desde el sidebar
  const goToCategory = (index) => {
    setCurrentReviewIndex(index);
    setWizardStep(4 + index);
  };
 
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
 
  const processDroppedFiles = (incomingFiles) => {
    const files = Array.from(incomingFiles || []);
    if (!files.length) return;
    const valid = files.filter(f => REVIEW_UPLOAD_CONFIG.documentation.allowedExtensions.includes(f.name.split('.').pop()?.toLowerCase() || ''));
    if (!valid.length) { setError("No se detectaron archivos válidos."); return; }
    setError(null);
    const newDocs = valid.map(f => ({ name: f.name, status: 'processing' }));
    setUploadedDocs(prev => [...prev, ...newDocs]);
    setTimeout(() => {
      setUploadedDocs(curr => curr.map(d => valid.find(v => v.name === d.name) && d.status === 'processing' ? { ...d, status: 'processed' } : d));
    }, 1200);
  };
  const handleFileChange = (e) => { processDroppedFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ''; };
  const removeDoc = (i) => setUploadedDocs(prev => prev.filter((_, idx) => idx !== i));
 
  const toggleFindingDecision = (findingId, decision) => {
    setFindingDecisions(prev => ({ ...prev, [findingId]: prev[findingId] === decision ? undefined : decision }));
  };
 
  const enviarDecisionesAlBackend = async () => {
    const aceptados = [];
    ANALYSIS_CATEGORIES.forEach(cat => {
      (findingsByCategory[cat.id] || []).forEach((f, i) => {
        if (findingDecisions[getFindingId(f, i)] === 'accepted') aceptados.push(f);
      });
    });
    if (aceptados.length === 0) { alert("No aceptaste ningún cambio."); return; }
    setIsSendingToBackend(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/apply-patches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: analysisResult.session_id || "sesion-actual", approved_findings: aceptados }),
      });
      if (!response.ok) throw new Error("Error aplicando parches");
      alert("¡Éxito! Los parches se aplicaron correctamente.");
      handleReset();
    } catch {
      alert("Error al enviar los cambios aceptados al backend.");
    } finally {
      setIsSendingToBackend(false);
    }
  };
 
  // ── COMPONENTES ────────────────────────────────────────────────────────
  const Header = () => (
    <nav className="bg-[#0f172a] px-8 py-3 flex justify-between items-center sticky top-0 z-20 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg"><Github className="text-white" size={20} /></div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-4xl font-bold text-white tracking-tight">AI Code Auditor</h1>
          <span className="text-[14px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">V1.0</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-900/30 border border-blue-500/30 rounded-full">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
          <span className="text-[15px] font-bold text-blue-300 tracking-wide">Gemini 1.5 Flash · Conectado</span>
        </div>
        <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center text-slate-300 font-bold text-base border border-slate-700">ES</div>
      </div>
    </nav>
  );
 
  const Footer = () => (
    <footer className="bg-white border-t border-slate-200 px-8 py-4 mt-auto">
      <div className="max-w-7xl mx-auto flex justify-between items-center text-[14px] font-bold text-slate-400 uppercase tracking-widest">
        <div className="flex gap-6"><span>ESCOM - INGENIERÍA EN IA</span><span>© 2024 AUDIT SYSTEM</span></div>
        <div className="flex gap-6">
          <span className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div> SISTEMA OPERATIVO</span>
          <span className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> API V1.2</span>
        </div>
      </div>
    </footer>
  );
 
  // PASO 1
  const Step1View = () => (
    <div className="flex justify-center items-center flex-1">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#0f172a] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-slate-200">
            <Github className="text-white" size={28} />
          </div>
          <h2 className="text-5xl font-black text-slate-800 tracking-tight">Conecta tu repositorio</h2>
          <p className="text-slate-400 text-lg mt-1">Ingresa la URL de GitHub para comenzar</p>
        </div>
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="space-y-4">
            <div>
              <label className="text-[14px] font-black text-slate-400 uppercase tracking-widest mb-2 block">URL DE GITHUB</label>
              <div className="relative">
                <input type="text" value={repoUrl} onChange={e => setRepoUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConnect()}
                  placeholder="https://github.com/..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
              </div>
            </div>
            {error && <p className="text-base text-red-500 font-bold px-3 py-2 bg-red-50 rounded-xl border border-red-100">{error}</p>}
            <button onClick={handleConnect} disabled={loadingFiles || !repoUrl}
              className={`w-full py-3.5 text-white text-lg font-bold rounded-xl transition-all flex justify-center items-center gap-2 shadow-md ${loadingFiles || !repoUrl ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-[#0f172a] hover:bg-slate-800 shadow-slate-200 active:scale-95'}`}>
              {loadingFiles ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ExternalLink size={15} />}
              {loadingFiles ? 'Conectando...' : 'Conectar Repositorio'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
 
  // PASO 2
  const Step2View = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1400px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-4 space-y-6">
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-slate-900 p-2 rounded-lg text-white"><Github size={18} /></div>
            <h2 className="text-lg font-bold text-slate-800">Repositorio Conectado</h2>
            <CheckCircle size={16} className="text-blue-500 ml-auto flex-shrink-0" />
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <Search size={13} className="text-slate-400 flex-shrink-0" />
            <span className="text-base font-mono text-slate-600 truncate">{repoUrl}</span>
          </div>
          <button onClick={handleReset} className="mt-3 text-[14px] font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-wider">← Cambiar repositorio</button>
        </section>
 
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-slate-900 p-2 rounded-lg text-white"><Zap size={18} /></div>
            <h2 className="text-lg font-bold text-slate-800">Resumen del Repo</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-5xl font-bold text-blue-600">{selectedFilesCount}<span className="text-slate-300 text-4xl">/{repoFiles.length}</span></p>
              <p className="text-[14px] font-bold text-slate-400 uppercase tracking-tighter leading-tight">Archivos En Matriz</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-5xl font-bold text-slate-800">{totalSelectionsCount}</p>
              <p className="text-[14px] font-bold text-slate-400 uppercase tracking-tighter leading-tight">Asignaciones Totales</p>
            </div>
          </div>
        </section>
 
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-slate-900 p-2 rounded-lg text-white"><FileText size={18} /></div>
            <h2 className="text-lg font-bold text-slate-800">Carga de Documentos</h2>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept=".pdf,.docx,.txt" className="hidden" />
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDraggingFiles(true); }}
            onDragLeave={() => setIsDraggingFiles(false)}
            onDrop={e => { e.preventDefault(); setIsDraggingFiles(false); processDroppedFiles(e.dataTransfer.files); }}>
            <Upload className={`mb-2 transition-colors ${isDraggingFiles ? 'text-blue-500' : 'text-slate-400 group-hover:text-blue-500'}`} size={20} />
            <p className="text-[14px] font-bold text-slate-500 uppercase tracking-tighter text-center">
              {uploadedDocs.length > 0 ? `${uploadedDocs.length} subido(s)` : 'Subir PDF o DOCX'}
            </p>
          </div>
          {uploadedDocs.length > 0 && (
            <div className="mt-4 space-y-2">
              {uploadedDocs.map((doc, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${doc.status === 'processed' ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    {doc.status === 'processing' ? <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={15} className="text-green-500" />}
                    <span className="text-[15px] font-medium truncate">{doc.name}</span>
                  </div>
                  <button onClick={() => removeDoc(i)} className="text-slate-300 hover:text-red-400"><X size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
 
      <div className="lg:col-span-8">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden h-[750px] flex flex-col">
          <div className="bg-[#0f172a] p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div className="flex items-center gap-3 text-white">
              <Folder size={18} className="text-blue-400" />
              <h3 className="text-lg font-bold tracking-wide">Matriz de Análisis</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {ANALYSIS_CATEGORIES.map(c => (
                <div key={c.id} className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
                  <p className="text-[14px] font-bold uppercase tracking-wide text-slate-400">{c.shortLabel}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-base font-bold text-white">{categorySelectionCounts[c.id]}</span>
                    <button onClick={() => selectAllForCategory(c.id)} className="text-[13px] font-bold uppercase text-blue-300 hover:text-white">Todo</button>
                    <button onClick={() => clearCategory(c.id)} className="text-[13px] font-bold uppercase text-slate-400 hover:text-white">Limpiar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <input type="text" placeholder="Filtrar archivos..." className="w-full bg-white border border-slate-200 rounded-lg pl-10 py-2 text-base outline-none focus:ring-2 focus:ring-blue-500/20" />
              <Search className="absolute left-3.5 top-2.5 text-slate-300" size={14} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {repoFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                <Folder size={48} className="mb-2" /><p className="text-base font-medium italic">Sin archivos</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[minmax(0,2.4fr)_repeat(4,minmax(88px,1fr))_110px] gap-2 px-3 text-[14px] font-black uppercase tracking-[0.18em] text-slate-400">
                  <span>Archivo</span>
                  {ANALYSIS_CATEGORIES.map(c => <span key={c.id} className="text-center">{c.shortLabel}</span>)}
                  <span className="text-center">Acciones</span>
                </div>
                {repoFiles.map((file, idx) => {
                  const inAny = ANALYSIS_CATEGORIES.some(c => selectedFileMatrix[c.id].has(file.path));
                  return (
                    <div key={idx} className={`grid grid-cols-[minmax(0,2.4fr)_repeat(4,minmax(88px,1fr))_110px] gap-2 rounded-2xl border p-3 transition-all ${inAny ? 'bg-blue-50/60 border-blue-200' : 'bg-white border-slate-100'}`}>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="bg-slate-100 p-1.5 rounded text-[14px] font-bold text-slate-500 uppercase">{file.extension.replace('.', '')}</div>
                        <span className="truncate text-base font-medium text-slate-700">{file.path}</span>
                      </div>
                      {ANALYSIS_CATEGORIES.map(c => {
                        const isSel = selectedFileMatrix[c.id].has(file.path);
                        return (
                          <button key={c.id} onClick={() => toggleCategorySelection(file.path, c.id)}
                            className={`flex h-10 items-center justify-center rounded-xl border transition-all ${isSel ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-400 hover:border-blue-300'}`}>
                            {isSel ? <Check size={14} /> : <span className="text-[14px] font-bold">+</span>}
                          </button>
                        );
                      })}
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => selectFileForAllCategories(file.path)} className="rounded-lg border border-slate-200 px-2 py-1 text-[14px] font-bold text-slate-500 hover:border-blue-300 hover:text-blue-600">Todas</button>
                        <button onClick={() => clearFileFromAllCategories(file.path)} className="rounded-lg border border-slate-200 px-2 py-1 text-[14px] font-bold text-slate-500 hover:border-red-300 hover:text-red-500">Limpiar</button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
          {error && <p className="text-base text-red-500 font-bold px-6 py-2 bg-red-50 border-t border-red-100">{error}</p>}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <p className="text-[15px] text-slate-400 font-medium">
              {selectedFilesCount === 0 ? 'Asigna archivos a la matriz para continuar'
                : selectedFilesCount > 10 ? `⚠️ Máximo 10 archivos (tienes ${selectedFilesCount})`
                : `${selectedFilesCount} archivo${selectedFilesCount > 1 ? 's' : ''} listo${selectedFilesCount > 1 ? 's' : ''}`}
            </p>
            <button onClick={startAnalysis} disabled={selectedFilesCount === 0}
              className={`px-8 py-3.5 rounded-xl font-bold text-base flex items-center gap-3 transition-all shadow-lg ${selectedFilesCount > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'}`}>
              <Zap size={16} fill="currentColor" /> ANALIZAR MATRIZ <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
 
  // ── RESULTADOS MEJORADOS ───────────────────────────────────────────────
  const ResultsView = () => {
    if (!analysisResult) return null;
    const activeCategory = currentReviewCategory || ANALYSIS_CATEGORIES[0];
    const isCurrentCategoryDone = isCategoryCompleted(activeCategory.id);
    const isLastCategory = currentReviewIndex === ANALYSIS_CATEGORIES.length - 1;
 
    return (
      <div className="max-w-7xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
 
        {/* ── ENCABEZADO CON MÉTRICAS ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-[#0f172a] px-8 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Revisión Guiada del Análisis</h2>
              <p className="text-slate-400 text-base mt-0.5">Evalúa cada hallazgo y decide si aceptas los cambios sugeridos</p>
            </div>
            <div className="flex items-center gap-2 text-base font-bold text-slate-400 bg-slate-800/50 px-4 py-2 rounded-xl">
              <span className="text-white">{ANALYSIS_CATEGORIES.filter(c => isCategoryCompleted(c.id)).length}</span>
              <span>/</span>
              <span>{ANALYSIS_CATEGORIES.length} aspectos revisados</span>
            </div>
          </div>
 
          {/* Barra de 5 métricas */}
          <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-slate-100 border-t border-slate-100">
            <div className="flex flex-col items-center justify-center py-6 px-4 md:col-span-1">
              <ScoreRing score={analysisResult.total_score} />
              <p className="text-[14px] font-black text-slate-400 uppercase tracking-widest mt-2">Score Global</p>
            </div>
            <div className="flex flex-col items-center justify-center py-6 px-4 gap-1">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-1">
                <ShieldAlert size={18} className="text-red-500" />
              </div>
              <span className="text-5xl font-black text-red-600">{reportStats.critical}</span>
              <span className="text-[14px] font-bold text-slate-400 uppercase tracking-wide">Críticos</span>
            </div>
            <div className="flex flex-col items-center justify-center py-6 px-4 gap-1">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-1">
                <AlertCircle size={18} className="text-amber-500" />
              </div>
              <span className="text-5xl font-black text-amber-600">{reportStats.warning}</span>
              <span className="text-[14px] font-bold text-slate-400 uppercase tracking-wide">Advertencias</span>
            </div>
            <div className="flex flex-col items-center justify-center py-6 px-4 gap-1">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-1">
                <Info size={18} className="text-blue-500" />
              </div>
              <span className="text-5xl font-black text-blue-600">{reportStats.info}</span>
              <span className="text-[14px] font-bold text-slate-400 uppercase tracking-wide">Informativos</span>
            </div>
            <div className="flex flex-col items-center justify-center py-6 px-4 gap-1">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-1">
                <FileText size={18} className="text-slate-500" />
              </div>
              <span className="text-5xl font-black text-slate-700">{reportStats.affectedFiles}</span>
              <span className="text-[14px] font-bold text-slate-400 uppercase tracking-wide">Afectados</span>
              <div className="w-full mt-1 px-2">
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full transition-all duration-700" style={{ width: `${reportStats.affectedPct}%` }} />
                </div>
                <p className="text-[13px] text-slate-400 text-center mt-0.5">{reportStats.affectedPct}% del total</p>
              </div>
            </div>
          </div>
        </div>
 
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 
          {/* ── SIDEBAR MEJORADO ── */}
          <aside className="lg:col-span-4">
            <div className="bg-transparent space-y-3 sticky top-24">
              <h3 className="text-[15px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 mb-4">Submenú de Revisión</h3>
              {ANALYSIS_CATEGORIES.map((category, index) => {
                const isActive = currentReviewIndex === index;
                const isDone   = isCategoryCompleted(category.id);
                const stats    = categoryStats[category.id];
                const Icon     = category.icon;
 
                return (
                  <button key={category.id} type="button" onClick={() => goToCategory(index)}
                    className={`w-full text-left rounded-[1.5rem] border p-5 transition-all ${
                      isActive ? 'border-blue-300 bg-blue-50/50 shadow-sm' :
                      isDone   ? 'border-slate-200 bg-white' :
                                 'border-slate-200 bg-white/60 hover:border-slate-300'
                    }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isActive ? 'bg-blue-100' : isDone ? 'bg-green-100' : 'bg-slate-100'
                        }`}>
                          <Icon size={14} className={isActive ? 'text-blue-600' : isDone ? 'text-green-600' : 'text-slate-400'} />
                        </div>
                        <div>
                          <p className="text-[13px] font-black uppercase tracking-widest text-slate-400">Aspecto {index + 1}</p>
                          <h4 className={`text-lg font-bold leading-tight ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>{category.label}</h4>
                        </div>
                      </div>
                      {isDone ? (
                        <span className="text-[13px] font-black uppercase px-2 py-1 rounded-lg bg-green-100 text-green-700 flex-shrink-0">✓ Listo</span>
                      ) : isActive ? (
                        <span className="text-[13px] font-black uppercase px-2 py-1 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">Actual</span>
                      ) : null}
                    </div>
 
                    {/* Chips de severidad */}
                    <div className="flex items-center gap-2 mb-2">
                      {stats.critical > 0 && (
                        <span className="flex items-center gap-1 text-[14px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
                          <ShieldAlert size={9} /> {stats.critical}
                        </span>
                      )}
                      {stats.warning > 0 && (
                        <span className="flex items-center gap-1 text-[14px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">
                          <AlertCircle size={9} /> {stats.warning}
                        </span>
                      )}
                      {stats.info > 0 && (
                        <span className="flex items-center gap-1 text-[14px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                          <Info size={9} /> {stats.info}
                        </span>
                      )}
                      {stats.total === 0 && <span className="text-[14px] font-bold text-slate-400">Sin hallazgos</span>}
                    </div>
 
                    {/* Barra tricolor */}
                    {stats.total > 0 && (
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full flex">
                          <div className="bg-red-400 h-full" style={{ width: `${(stats.critical / stats.total) * 100}%` }} />
                          <div className="bg-amber-400 h-full" style={{ width: `${(stats.warning / stats.total) * 100}%` }} />
                          <div className="bg-blue-400 h-full" style={{ width: `${(stats.info / stats.total) * 100}%` }} />
                        </div>
                      </div>
                    )}
                    {stats.total === 0 && (
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-400 w-full" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>
 
          {/* ── SECCIÓN PRINCIPAL ── */}
          <section className="lg:col-span-8 space-y-5">
            <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-5">
 
              {!reviewCompleted ? (
                <>
                  {/* Header de categoría activa con sus conteos */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-[14px] font-black uppercase tracking-[0.2em] text-slate-400">Revisión Actual</p>
                      <h3 className="text-5xl font-black text-slate-900 tracking-tight">{activeCategory.label}</h3>
                      <p className="text-lg text-slate-400">Evalúa cada hallazgo y decide si aceptas la corrección.</p>
                    </div>
                    <div className="flex gap-3 flex-shrink-0">
                      <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center">
                        <p className="text-[13px] font-black uppercase tracking-wide text-red-400">Críticos</p>
                        <p className="text-xl font-bold text-red-600">{categoryStats[activeCategory.id].critical}</p>
                      </div>
                      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-center">
                        <p className="text-[13px] font-black uppercase tracking-wide text-amber-400">Alertas</p>
                        <p className="text-xl font-bold text-amber-600">{categoryStats[activeCategory.id].warning}</p>
                      </div>
                      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-center">
                        <p className="text-[13px] font-black uppercase tracking-wide text-blue-400">Info</p>
                        <p className="text-xl font-bold text-blue-600">{categoryStats[activeCategory.id].info}</p>
                      </div>
                    </div>
                  </div>
 
                  {/* Filtros */}
                  <div className="flex flex-wrap gap-3 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-black text-slate-400 uppercase">Severidad:</span>
                      <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
                        className="text-base font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20">
                        <option value="all">Todos</option>
                        <option value="critical">Críticos</option>
                        <option value="warning">Advertencias</option>
                        <option value="info">Informativos</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-black text-slate-400 uppercase">Tipo:</span>
                      <select value={filterType} onChange={e => setFilterType(e.target.value)}
                        className="text-base font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20">
                        {uniqueTypes.map(t => <option key={t} value={t}>{t === 'all' ? 'Todos los tipos' : t}</option>)}
                      </select>
                    </div>
                    <span className="text-[14px] text-slate-400 ml-auto">{currentCategoryFindings.length} hallazgo{currentCategoryFindings.length !== 1 ? 's' : ''}</span>
                  </div>
 
                  {/* ── TARJETAS DE HALLAZGOS MEJORADAS ── */}
                  {currentCategoryFindings.length > 0 ? (
                    <div className="space-y-4">
                      {currentCategoryFindings.map((finding, index) => {
                        const findingId = getFindingId(finding, index);
                        const decision = findingDecisions[findingId];
                        const isC = finding.severity === 'critical';
                        const isW = finding.severity === 'warning';
 
                        return (
                          <div key={findingId} className={`rounded-2xl border overflow-hidden shadow-sm transition-all ${
                            decision === 'accepted' ? 'border-green-300 shadow-green-50' :
                            decision === 'rejected' ? 'border-red-300 shadow-red-50'   :
                            isC ? 'border-red-200' : isW ? 'border-amber-200' : 'border-blue-200'
                          }`}>
                            {/* Banda de severidad */}
                            <div className={`px-5 py-2 flex items-center justify-between ${
                              decision === 'accepted' ? 'bg-green-50' :
                              decision === 'rejected' ? 'bg-red-50'   :
                              isC ? 'bg-red-50' : isW ? 'bg-amber-50' : 'bg-blue-50'
                            }`}>
                              <div className="flex items-center gap-2">
                                {isC ? <ShieldAlert size={13} className="text-red-500" /> : isW ? <AlertCircle size={13} className="text-amber-500" /> : <Info size={13} className="text-blue-500" />}
                                <span className={`text-[14px] font-black uppercase tracking-widest ${isC ? 'text-red-600' : isW ? 'text-amber-600' : 'text-blue-600'}`}>
                                  {isC ? 'Crítico' : isW ? 'Advertencia' : 'Informativo'}
                                </span>
                                {decision && (
                                  <span className={`text-[13px] font-black uppercase px-2 py-0.5 rounded-full ml-2 ${decision === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                    {decision === 'accepted' ? '✓ Aceptado' : '✗ Rechazado'}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] font-bold bg-white/70 px-2 py-0.5 rounded-lg text-slate-600 font-mono">{finding.file_path}</span>
                                {finding.line && <span className="text-[14px] font-bold bg-white/70 px-2 py-0.5 rounded-lg text-slate-500">Línea {finding.line}</span>}
                                <span className={`text-[14px] font-bold px-2 py-0.5 rounded-lg ${isC ? 'bg-red-100 text-red-700' : isW ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{finding.type}</span>
                              </div>
                            </div>
 
                            {/* Cuerpo */}
                            <div className="bg-white p-5 space-y-3">
                              <h4 className="text-lg font-bold text-slate-800 leading-snug">{finding.title}</h4>
                              <p className="text-lg text-slate-500 leading-relaxed">{finding.description}</p>
                              <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <span className="text-lg">💡</span>
                                <div>
                                  <span className="text-[14px] font-black uppercase tracking-wide text-slate-400 block mb-0.5">Sugerencia</span>
                                  <span className="text-lg text-slate-600">{finding.recommendation}</span>
                                </div>
                              </div>
 
                              {(finding.original_code || finding.secure_code) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-[14px] font-black text-red-400 uppercase tracking-widest">
                                      <X size={10} /> Código Original
                                    </div>
                                    <pre className="bg-red-50/40 border border-red-100 p-4 rounded-xl text-[15px] font-mono text-red-800 overflow-x-auto whitespace-pre-wrap">
                                      <code>{finding.original_code || '# No hay código'}</code>
                                    </pre>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-[14px] font-black text-green-500 uppercase tracking-widest">
                                      <Check size={10} /> Código Corregido
                                    </div>
                                    <pre className="bg-green-50 border border-green-100 p-4 rounded-xl text-[15px] font-mono text-green-800 overflow-x-auto whitespace-pre-wrap shadow-inner">
                                      <code>{finding.secure_code || '# Sin cambios'}</code>
                                    </pre>
                                  </div>
                                </div>
                              )}
 
                              {/* Botones por hallazgo */}
                              <div className="flex gap-3 pt-3 border-t border-slate-100">
                                <button onClick={() => toggleFindingDecision(findingId, 'rejected')}
                                  className={`flex-1 py-2.5 rounded-xl font-bold text-base flex justify-center items-center gap-2 transition-all ${
                                    decision === 'rejected' ? 'bg-red-500 text-white shadow-md shadow-red-200' : 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600'
                                  }`}>
                                  <X size={13} /> Rechazar Corrección
                                </button>
                                <button onClick={() => toggleFindingDecision(findingId, 'accepted')}
                                  className={`flex-1 py-2.5 rounded-xl font-bold text-base flex justify-center items-center gap-2 transition-all ${
                                    decision === 'accepted' ? 'bg-green-500 text-white shadow-md shadow-green-200' : 'bg-slate-100 text-slate-500 hover:bg-green-50 hover:text-green-600'
                                  }`}>
                                  <Check size={13} /> Aceptar Corrección
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl py-12 text-center">
                      <p className="text-slate-400 font-medium italic">No hay hallazgos para este aspecto. Puedes avanzar.</p>
                    </div>
                  )}
 
                  {/* Botón siguiente categoría */}
                  <div className="flex justify-between items-center border-t border-slate-100 pt-5">
                    <button onClick={handleReset} className="flex items-center gap-2 text-slate-400 font-bold hover:text-blue-600 transition-colors text-lg">
                      <ArrowLeft size={16} /> Nuevo análisis
                    </button>
                    {!isLastCategory ? (
                      <button onClick={advanceToNextCategory} disabled={!isCurrentCategoryDone}
                        className={`px-8 py-3 rounded-xl font-bold text-lg flex items-center gap-2 transition-all ${
                          isCurrentCategoryDone ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}>
                        Siguiente Aspecto <ChevronRight size={16} />
                      </button>
                    ) : (
                      <button onClick={advanceToNextCategory} disabled={!isCurrentCategoryDone}
                        className={`px-8 py-3 rounded-xl font-bold text-lg flex items-center gap-2 transition-all ${
                          isCurrentCategoryDone ? 'bg-[#0f172a] text-white shadow-lg shadow-slate-300 hover:bg-slate-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}>
                        Ver Resumen Final <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* ── RESUMEN FINAL MEJORADO ── */
                <div className="space-y-6">
                  <div className="text-center pb-4 border-b border-slate-100">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} className="text-green-600" />
                    </div>
                    <h3 className="text-5xl font-black text-slate-900 tracking-tight">Revisión Finalizada</h3>
                    <p className="text-slate-500 mt-1 text-lg">Has evaluado todos los hallazgos propuestos por la IA.</p>
                  </div>
 
                  {/* Tarjetas por categoría */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ANALYSIS_CATEGORIES.map(category => {
                      const stats = categoryStats[category.id];
                      const findings = findingsByCategory[category.id] || [];
                      const accepted = findings.filter((f, i) => findingDecisions[getFindingId(f, i)] === 'accepted').length;
                      const rejected = findings.filter((f, i) => findingDecisions[getFindingId(f, i)] === 'rejected').length;
                      const Icon = category.icon;
 
                      return (
                        <div key={category.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                              <Icon size={13} className="text-slate-500" />
                            </div>
                            <p className="text-lg font-bold text-slate-800">{category.label}</p>
                          </div>
                          <div className="flex gap-3 mb-3">
                            {stats.critical > 0 && <span className="text-[14px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">{stats.critical} críticos</span>}
                            {stats.warning  > 0 && <span className="text-[14px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">{stats.warning} alertas</span>}
                            {stats.info     > 0 && <span className="text-[14px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{stats.info} info</span>}
                            {stats.total === 0  && <span className="text-[14px] font-bold text-slate-400">Sin hallazgos</span>}
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-1 text-center bg-green-50 rounded-xl py-2 border border-green-100">
                              <span className="text-4xl font-black text-green-600">{accepted}</span>
                              <p className="text-[13px] font-bold text-green-500 uppercase">Aceptados</p>
                            </div>
                            <div className="flex-1 text-center bg-red-50 rounded-xl py-2 border border-red-100">
                              <span className="text-4xl font-black text-red-500">{rejected}</span>
                              <p className="text-[13px] font-bold text-red-400 uppercase">Rechazados</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
 
                  {/* Totales globales */}
                  <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-2xl border border-slate-200 p-4">
                    <div className="text-center">
                      <span className="text-5xl font-black text-green-600">
                        {ANALYSIS_CATEGORIES.reduce((t, cat) => t + (findingsByCategory[cat.id] || []).filter((f, i) => findingDecisions[getFindingId(f, i)] === 'accepted').length, 0)}
                      </span>
                      <p className="text-[14px] font-bold text-slate-400 uppercase mt-0.5">Total Aceptados</p>
                    </div>
                    <div className="text-center">
                      <span className="text-5xl font-black text-red-500">
                        {ANALYSIS_CATEGORIES.reduce((t, cat) => t + (findingsByCategory[cat.id] || []).filter((f, i) => findingDecisions[getFindingId(f, i)] === 'rejected').length, 0)}
                      </span>
                      <p className="text-[14px] font-bold text-slate-400 uppercase mt-0.5">Total Rechazados</p>
                    </div>
                    <div className="text-center">
                      <span className="text-5xl font-black text-slate-700">{analysisResult.findings?.length || 0}</span>
                      <p className="text-[14px] font-bold text-slate-400 uppercase mt-0.5">Total Hallazgos</p>
                    </div>
                  </div>
 
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center">
                    <p className="text-lg font-bold text-slate-600 mb-5">Estás a punto de inyectar las correcciones aceptadas a tu entorno virtual.</p>
                    <button onClick={enviarDecisionesAlBackend} disabled={isSendingToBackend}
                      className="w-full md:w-auto px-10 py-4 rounded-2xl font-black text-lg flex items-center justify-center mx-auto gap-3 text-white bg-[#0f172a] hover:bg-slate-800 shadow-xl shadow-slate-300 transition-all active:scale-95">
                      {isSendingToBackend ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Zap size={18} />}
                      {isSendingToBackend ? 'Aplicando Parches...' : 'Aplicar Cambios'}
                    </button>
                  </div>
 
                  <button onClick={handleReset} className="block text-center w-full text-base font-bold text-slate-400 hover:text-blue-600 transition-colors">
                    Empezar un nuevo análisis
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  };
 
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {Header()}
      <WizardBar currentStep={wizardStep} />
      <main className="flex-1 px-8 py-10 flex flex-col">
        {view === 'setup' && wizardStep === 1 && Step1View()}
        {view === 'setup' && wizardStep === 2 && Step2View()}
        {view === 'analyzing' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in zoom-in duration-500">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Github className="text-blue-600 animate-pulse" size={32} />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-6xl font-black text-slate-800 tracking-tight italic">Analizando Matriz...</h2>
              <p className="text-slate-400 mt-2 font-medium">Procesando {selectedFilesCount} archivos en {totalSelectionsCount} asignaciones.</p>
            </div>
          </div>
        )}
        {view === 'results' && ResultsView()}
      </main>
      {Footer()}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </div>
  );
};
 
export default App;

