import React, { useState, useRef, useMemo } from 'react';
import { 
  Github, FileText, Upload, Search, ChevronRight, Folder,
  CheckCircle, AlertCircle, ArrowLeft, Zap, ShieldAlert, Info, ExternalLink, X,
  Check
} from 'lucide-react';

// 1. ELIMINADA LA OPCIÓN DE CÓDIGO EXTERNO
const REVIEW_UPLOAD_CONFIG = {
  documentation: {
    label: 'Documentos de Arquitectura',
    helper: 'Arrastra PDFs, Word o archivos de texto',
    accept: '.pdf,.doc,.docx,.txt,.md',
    allowedExtensions: ['pdf', 'doc', 'docx', 'txt', 'md'],
  },
};

const ANALYSIS_CATEGORIES = [
  { id: 'business_rules', label: 'Reglas de negocio', shortLabel: 'Negocio' },
  { id: 'security', label: 'Seguridad', shortLabel: 'Seguridad' },
  { id: 'best_practices', label: 'Buenas practicas', shortLabel: 'Practicas' },
  { id: 'software_logic', label: 'Logica del software', shortLabel: 'Logica' },
];

const createEmptyCategorySelection = () =>
  ANALYSIS_CATEGORIES.reduce((acc, category) => {
    acc[category.id] = new Set();
    return acc;
  }, {});

const App = () => {
  const [view, setView] = useState('setup');
  const [repoUrl, setRepoUrl] = useState('');
  const [repoFiles, setRepoFiles] = useState([]);
  const [selectedFileMatrix, setSelectedFileMatrix] = useState(createEmptyCategorySelection);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [uploadReviewType] = useState('documentation'); // Fijo en documentación
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const fileInputRef = useRef(null);

  const filteredFindings = useMemo(() => {
    if (!analysisResult) return [];
    return analysisResult.findings.filter(finding => {
      const matchSeverity = filterSeverity === 'all' || finding.severity === filterSeverity;
      const matchType = filterType === 'all' || finding.type === filterType;
      return matchSeverity && matchType;
    });
  }, [analysisResult, filterSeverity, filterType]);

  const uniqueTypes = useMemo(() => {
    if (!analysisResult) return ['all'];
    const types = analysisResult.findings.map(f => f.type);
    return ['all', ...new Set(types)];
  }, [analysisResult]);

  const selectedFilesCount = useMemo(() => {
    const uniqueFiles = new Set();
    ANALYSIS_CATEGORIES.forEach(category => {
      selectedFileMatrix[category.id].forEach(path => uniqueFiles.add(path));
    });
    return uniqueFiles.size;
  }, [selectedFileMatrix]);

  const totalSelectionsCount = useMemo(() => (
    ANALYSIS_CATEGORIES.reduce(
      (total, category) => total + selectedFileMatrix[category.id].size,
      0
    )
  ), [selectedFileMatrix]);

  const categorySelectionCounts = useMemo(() => (
    ANALYSIS_CATEGORIES.reduce((acc, category) => {
      acc[category.id] = selectedFileMatrix[category.id].size;
      return acc;
    }, {})
  ), [selectedFileMatrix]);

  const handleConnect = async () => {
    if (!repoUrl) {
      alert("⚠️ Por favor, ingresa una URL de GitHub primero.");
      return;
    }

    setLoadingFiles(true);
    setError(null);

    try {
      console.log("🚀 Enviando URL al backend:", repoUrl);

      const response = await fetch("http://127.0.0.1:8000/files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repo_url: repoUrl }),
      });

      if (!response.ok) {
        throw new Error(`El servidor respondió con código: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Archivos recibidos:", data);

      // 2. PARSEO ROBUSTO: Por si el backend manda strings puros u objetos
      const listaArchivos = data.files || data.archivos || [];
      const archivosMapeados = listaArchivos.map((archivo) => {
        if (typeof archivo === 'string') {
          return { path: archivo, extension: `.${archivo.split('.').pop()}` };
        }
        return { path: archivo.path, extension: archivo.extension };
      });

      setRepoFiles(archivosMapeados);
      setSelectedFileMatrix(createEmptyCategorySelection());

    } catch (err) {
      console.error("❌ Error en la conexión:", err);
      setError("No se pudo conectar con el backend. Verifica que la URL sea válida.");
    } finally {
      setLoadingFiles(false);
    }
  };

  const toggleCategorySelection = (path, categoryId) => {
    setSelectedFileMatrix(prev => {
      const updated = { ...prev, [categoryId]: new Set(prev[categoryId]) };
      if (updated[categoryId].has(path)) {
        updated[categoryId].delete(path);
      } else {
        updated[categoryId].add(path);
      }
      return updated;
    });
  };

  const selectAllForCategory = (categoryId) => {
    setSelectedFileMatrix(prev => ({
      ...prev,
      [categoryId]: new Set(repoFiles.map(file => file.path)),
    }));
  };

  const clearCategory = (categoryId) => {
    setSelectedFileMatrix(prev => ({
      ...prev,
      [categoryId]: new Set(),
    }));
  };

  const selectFileForAllCategories = (path) => {
    setSelectedFileMatrix(prev => {
      const updated = { ...prev };
      ANALYSIS_CATEGORIES.forEach(category => {
        updated[category.id] = new Set(prev[category.id]);
        updated[category.id].add(path);
      });
      return updated;
    });
  };

  const clearFileFromAllCategories = (path) => {
    setSelectedFileMatrix(prev => {
      const updated = { ...prev };
      ANALYSIS_CATEGORIES.forEach(category => {
        updated[category.id] = new Set(prev[category.id]);
        updated[category.id].delete(path);
      });
      return updated;
    });
  };

  const startAnalysis = async () => {
    const selectedFilesByCategory = ANALYSIS_CATEGORIES.reduce((acc, category) => {
      acc[category.id] = Array.from(selectedFileMatrix[category.id]);
      return acc;
    }, {});

    const uniqueSelectedFiles = Array.from(
      new Set(Object.values(selectedFilesByCategory).flat())
    );

    if (uniqueSelectedFiles.length === 0) return;
    
    setView('analyzing');
    setError(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_url: repoUrl,
          selected_files: uniqueSelectedFiles,
          selected_files_by_category: selectedFilesByCategory,
        }),
      });

      if (!response.ok) throw new Error("Error al procesar el análisis");

      const data = await response.json();
      console.log("📊 REPORTE RECIBIDO DEL BACKEND:", data);
      setAnalysisResult(data);
      setView('results');

    } catch (err) {
      console.error(err);
      setError("Error al conectar con el motor de IA.");
      setView('setup');
    }
  };

  const finishProcessingDocs = (fileNames) => {
    setTimeout(() => {
      setUploadedDocs(current =>
        current.map(doc =>
          fileNames.includes(doc.name) && doc.status === 'processing'
            ? { ...doc, status: 'processed' }
            : doc
        )
      );
    }, 1200);
  };

  const processDroppedFiles = (incomingFiles, reviewType) => {
    const files = Array.from(incomingFiles || []);
    if (!files.length) return;

    const { allowedExtensions, label } = REVIEW_UPLOAD_CONFIG[reviewType];
    const validFiles = files.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      return allowedExtensions.includes(extension);
    });

    if (!validFiles.length) {
      setError(`No se detectaron archivos válidos para ${label.toLowerCase()}.`);
      return;
    }

    if (validFiles.length !== files.length) {
      setError(`Algunos archivos se ignoraron porque no son documentos de arquitectura.`);
    } else {
      setError(null);
    }

    const newDocs = validFiles.map(file => ({
      name: file.name,
      status: 'processing',
      reviewType,
      size: file.size,
    }));

    setUploadedDocs(prev => [...prev, ...newDocs]);
    finishProcessingDocs(validFiles.map(file => file.name));
  };

  const handleFileChange = (e) => {
    processDroppedFiles(e.target.files, uploadReviewType);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeDoc = (index) => {
    setUploadedDocs(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDraggingFiles(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingFiles(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDraggingFiles(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingFiles(false);
    processDroppedFiles(e.dataTransfer.files, uploadReviewType);
  };

  // --- COMPONENTES DE INTERFAZ ---

  const Header = () => (
    <nav className="bg-[#0f172a] px-8 py-3 flex justify-between items-center sticky top-0 z-20 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Github className="text-white" size={20} />
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-bold text-white tracking-tight">AI Code Auditor</h1>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">V1.0</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-900/30 border border-blue-500/30 rounded-full">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
          <span className="text-[11px] font-bold text-blue-300 tracking-wide">Gemini 1.5 Flash · Conectado</span>
        </div>
        <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center text-slate-300 font-bold text-xs border border-slate-700">
          ES
        </div>
      </div>
    </nav>
  );

  const Footer = () => (
    <footer className="bg-white border-t border-slate-200 px-8 py-4 mt-auto">
      <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <div className="flex gap-6">
          <span>ESCOM - INGENIERÍA EN IA</span>
          <span>© 2024 AUDIT SYSTEM</span>
        </div>
        <div className="flex gap-6">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div> SISTEMA OPERATIVO
          </span>
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div> API V1.2
          </span>
        </div>
      </div>
    </footer>
  );

  const SetupView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1400px] mx-auto w-full animate-in fade-in duration-700">
      
      <div className="lg:col-span-4 space-y-6">
        
        {/* 1. CARD: REPOSITORIO */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-slate-900 p-2 rounded-lg text-white"><Github size={18} /></div>
            <h2 className="text-sm font-bold text-slate-800">Repositorio de Código</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">URL DE GITHUB</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
                <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
              </div>
            </div>
            
            {/* 3. BOTÓN CON ESTADO DE CARGA */}
            <button 
              onClick={handleConnect}
              disabled={loadingFiles}
              className={`w-full py-3.5 text-white text-xs font-bold rounded-xl transition-all flex justify-center items-center gap-2 shadow-md ${
                loadingFiles ? 'bg-slate-700 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'
              }`}
            >
              {loadingFiles ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <ExternalLink size={14} />
              )}
              {loadingFiles ? 'Extrayendo Repo...' : 'Conectar Repositorio'}
            </button>
          </div>
        </section>

        {/* 2. CARD: RESUMEN DEL REPO */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-slate-900 p-2 rounded-lg text-white"><Zap size={18} /></div>
            <h2 className="text-sm font-bold text-slate-800">Resumen del Repo</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-2xl font-bold text-blue-600">{selectedFilesCount}<span className="text-slate-300 text-lg">/{repoFiles.length}</span></p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-tight">Archivos En Matriz</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-2xl font-bold text-slate-800">{totalSelectionsCount}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-tight">Asignaciones Totales</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {ANALYSIS_CATEGORIES.map(category => (
              <div key={category.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{category.shortLabel}</p>
                <p className="text-sm font-bold text-slate-800">{categorySelectionCounts[category.id]}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 3. CARD: ARQUITECTURA (Botones removidos) */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-slate-900 p-2 rounded-lg text-white"><FileText size={18} /></div>
            <h2 className="text-sm font-bold text-slate-800">Carga de Documentos</h2>
          </div>

          <p className="text-xs text-slate-500 mb-4 font-medium">
            Sube aquí los documentos de reglas de negocio para el análisis de arquitectura.
          </p>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            multiple 
            accept={REVIEW_UPLOAD_CONFIG.documentation.accept}
            className="hidden" 
          />

          <div 
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center transition-all cursor-pointer group ${
              isDraggingFiles
                ? 'border-blue-400 bg-blue-50'
                : 'border-slate-200 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className={`mb-2 transition-colors ${isDraggingFiles ? 'text-blue-500' : 'text-slate-400 group-hover:text-blue-500'}`} size={20} />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter text-center">
              {isDraggingFiles
                ? 'Suelta los archivos aquí'
                : uploadedDocs.length > 0
                  ? `${uploadedDocs.length} subido(s)`
                  : REVIEW_UPLOAD_CONFIG.documentation.helper}
            </p>
          </div>

          {error && (
            <p className="mt-3 text-[11px] font-medium text-red-500">
              {error}
            </p>
          )}

          {uploadedDocs.length > 0 && (
            <div className="mt-4 space-y-2">
              {uploadedDocs.map((doc, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-500 ${
                    doc.status === 'processed'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {doc.status === 'processing' ? (
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    ) : (
                      <CheckCircle size={15} className="text-green-500 flex-shrink-0" />
                    )}
 
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                      doc.status === 'processed' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {doc.name.split('.').pop().toUpperCase()}
                    </span>
 
                    <span className={`text-[11px] font-medium truncate ${
                      doc.status === 'processed' ? 'text-green-900' : 'text-slate-600'
                    }`}>
                      {doc.name}
                    </span>
                  </div>
 
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${
                      doc.status === 'processed' ? 'text-green-500' : 'text-blue-400'
                    }`}>
                      {doc.status === 'processed' ? 'Listo ✓' : 'Procesando...'}
                    </span>
 
                    <button
                      onClick={(e) => { e.stopPropagation(); removeDoc(i); }}
                      className="text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Panel Derecho (Explorador) */}
      <div className="lg:col-span-8">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden h-[750px] flex flex-col">
          <div className="bg-[#0f172a] p-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3 text-white">
              <Folder size={18} className="text-blue-400" />
              <div>
                <h3 className="text-sm font-bold tracking-wide">Matriz de Análisis</h3>
                <p className="text-[10px] font-medium text-slate-400">
                  Marca cada archivo en una o varias categorías según el análisis que necesites.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {ANALYSIS_CATEGORIES.map(category => (
                <div key={category.id} className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{category.shortLabel}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{categorySelectionCounts[category.id]}</span>
                    <button
                      type="button"
                      onClick={() => selectAllForCategory(category.id)}
                      className="text-[9px] font-bold uppercase tracking-wide text-blue-300 hover:text-white"
                    >
                      Todo
                    </button>
                    <button
                      type="button"
                      onClick={() => clearCategory(category.id)}
                      className="text-[9px] font-bold uppercase tracking-wide text-slate-400 hover:text-white"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              ))}
              <div className="bg-blue-600 text-white text-[11px] font-bold px-3 py-1 rounded-full">
                {selectedFilesCount} archivos / {totalSelectionsCount} marcas
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Filtrar archivos..." 
                className="w-full bg-white border border-slate-200 rounded-lg pl-10 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <Search className="absolute left-3.5 top-2.5 text-slate-300" size={14} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {repoFiles.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                  <Folder size={48} className="mb-2" />
                  <p className="text-xs font-medium italic">Sin archivos cargados</p>
               </div>
            ) : (
              <>
                <div className="grid grid-cols-[minmax(0,2.4fr)_repeat(4,minmax(88px,1fr))_110px] gap-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  <span>Archivo</span>
                  {ANALYSIS_CATEGORIES.map(category => (
                    <span key={category.id} className="text-center">{category.shortLabel}</span>
                  ))}
                  <span className="text-center">Acciones</span>
                </div>

                {repoFiles.map((file, idx) => {
                  const selectedInAnyCategory = ANALYSIS_CATEGORIES.some(category =>
                    selectedFileMatrix[category.id].has(file.path)
                  );

                  return (
                    <div
                      key={idx}
                      className={`grid grid-cols-[minmax(0,2.4fr)_repeat(4,minmax(88px,1fr))_110px] gap-2 rounded-2xl border p-3 transition-all ${
                        selectedInAnyCategory ? 'bg-blue-50/60 border-blue-200' : 'bg-white border-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="bg-slate-100 p-1.5 rounded text-[10px] font-bold text-slate-500 uppercase">
                          {file.extension.replace('.', '') || 'FILE'}
                        </div>
                        <span className="truncate text-xs font-medium text-slate-700">{file.path}</span>
                      </div>

                      {ANALYSIS_CATEGORIES.map(category => {
                        const isSelected = selectedFileMatrix[category.id].has(file.path);
                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => toggleCategorySelection(file.path, category.id)}
                            className={`flex h-10 items-center justify-center rounded-xl border transition-all ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                                : 'border-slate-200 bg-white text-slate-400 hover:border-blue-300 hover:text-blue-500'
                            }`}
                          >
                            {isSelected ? <Check size={14} /> : <span className="text-[10px] font-bold">+</span>}
                          </button>
                        );
                      })}

                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => selectFileForAllCategories(file.path)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-500 transition-colors hover:border-blue-300 hover:text-blue-600"
                        >
                          Todas
                        </button>
                        <button
                          type="button"
                          onClick={() => clearFileFromAllCategories(file.path)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-500 transition-colors hover:border-red-300 hover:text-red-500"
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {repoFiles.length > 0 && (
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={startAnalysis}
                disabled={selectedFilesCount === 0}
                className={`px-8 py-3.5 rounded-xl font-bold text-xs flex items-center gap-3 transition-all shadow-lg active:scale-95 ${selectedFilesCount > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
              >
                <Zap size={16} fill="currentColor" />
                ANALIZAR MATRIZ
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const ResultsView = () => {
    if (!analysisResult) return null;

    return (
      <div className="max-w-5xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Encabezado de Resultados */}
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="text-left">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Reporte de Auditoría</h2>
            <p className="text-slate-400 font-medium">Análisis completado en {analysisResult.files_analyzed} archivos</p>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className={`text-5xl font-black ${analysisResult.total_score > 70 ? 'text-green-500' : 'text-orange-500'}`}>
                {analysisResult.total_score}<span className="text-xl text-slate-300">/100</span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Global Score</p>
            </div>
            <div className="h-12 w-[1px] bg-slate-100 hidden md:block"></div>
            <div className="flex gap-4">
              <div className="text-center px-4 py-2 bg-red-50 rounded-2xl border border-red-100">
                <p className="text-xl font-black text-red-600">{analysisResult.critical_issues}</p>
                <p className="text-[9px] font-bold text-red-400 uppercase">Críticos</p>
              </div>
              <div className="text-center px-4 py-2 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="text-xl font-black text-amber-600">{analysisResult.warnings}</p>
                <p className="text-[9px] font-bold text-amber-400 uppercase">Alertas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap gap-4 items-center bg-white/50 p-4 rounded-3xl border border-slate-100 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Severidad:</span>
            <select 
              value={filterSeverity} 
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Todos</option>
              <option value="critical">Críticos</option>
              <option value="warning">Advertencias</option>
              <option value="info">Informativos</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Tipo:</span>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {uniqueTypes.map(t => (
                <option key={t} value={t}>{t === 'all' ? 'Todos los tipos' : t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de Hallazgos */}
        <div className="space-y-4">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">
            Hallazgos Detectados ({filteredFindings.length})
          </h3>
          
          {filteredFindings.length > 0 ? (
            filteredFindings.map((finding, i) => (
              <div key={i} className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all text-left flex flex-col gap-6">
                <div className="flex gap-6">
                  <div className={`mt-1 p-3 rounded-2xl shrink-0 ${
                    finding.severity === 'critical' ? 'bg-red-100 text-red-600' : 
                    finding.severity === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {finding.severity === 'critical' ? <ShieldAlert size={24} /> : finding.severity === 'warning' ? <AlertCircle size={24} /> : <Info size={24} />}
                  </div>
                  
                  <div className="space-y-2 flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex gap-2 mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 uppercase tracking-wider">
                            {finding.file_path} : Línea {finding.line}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 uppercase tracking-wider">
                            {finding.type}
                          </span>
                        </div>
                        <h4 className="text-lg font-bold text-slate-800">{finding.title}</h4>
                      </div>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed">{finding.description}</p>
                    <div className="pt-2 flex items-center gap-2 text-sm">
                      <span className="font-bold text-slate-700">💡 Sugerencia:</span>
                      <span className="text-slate-600">{finding.recommendation}</span>
                    </div>
                  </div>
                </div>

                {/* --- COMPARADOR DE CÓDIGO --- */}
                {(finding.original_code || finding.secure_code) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-50 pt-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-black text-red-400 uppercase tracking-widest px-1">
                        <X size={12} /> Código Original
                      </div>
                      <pre className="bg-red-50/30 border border-red-100 p-4 rounded-xl text-[11px] font-mono text-red-800 overflow-x-auto whitespace-pre-wrap">
                        <code>{finding.original_code || "# No hay código disponible"}</code>
                      </pre>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-black text-green-500 uppercase tracking-widest px-1">
                        <Check size={12} /> Código Corregido
                      </div>
                      <pre className="bg-green-50 border border-green-100 p-4 rounded-xl text-[11px] font-mono text-green-800 overflow-x-auto whitespace-pre-wrap shadow-inner">
                        <code>{finding.secure_code || "# Sin cambios requeridos"}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-3xl py-12 text-center">
              <p className="text-slate-400 font-medium italic">No hay hallazgos que coincidan con los filtros seleccionados.</p>
            </div>
          )}
        </div>

        <button 
          onClick={() => setView('setup')}
          className="flex items-center gap-2 text-slate-400 font-bold hover:text-blue-600 transition-colors mx-auto pb-10"
        >
          <ArrowLeft size={18} /> Volver a configurar análisis
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* 1. Lo llamamos como función en lugar de <Header /> */}
      {Header()} 
      
      <main className="flex-1 px-8 py-10 flex flex-col justify-center">
        {/* 2. Lo llamamos como función para que React no destruya el scroll */}
        {view === 'setup' && SetupView()}
        
        {view === 'analyzing' && (
           <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in zoom-in duration-500">
             <div className="relative">
               <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <Github className="text-blue-600 animate-pulse" size={32} />
               </div>
             </div>
             <div className="text-center">
               <h2 className="text-3xl font-black text-slate-800 tracking-tight italic">Analizando Matriz...</h2>
               <p className="text-slate-400 mt-2 font-medium">Procesando {selectedFilesCount} archivos en {totalSelectionsCount} asignaciones.</p>
             </div>
           </div>
        )}
        
        {/* 3. Lo llamamos como función */}
        {view === 'results' && ResultsView()}
      </main>
      
      {/* 4. Lo llamamos como función */}
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
