import React, { useState, useRef, useMemo } from 'react';
import { 
  Github, FileText, Upload, Search, ChevronRight, Folder, File, 
  Play, CheckCircle, AlertCircle, ArrowLeft, Zap, ShieldAlert, Info, ExternalLink, X,
  CheckSquare, Square, Code, Check
} from 'lucide-react';

const App = () => {
  const [view, setView] = useState('setup'); // 'setup' | 'analyzing' | 'results'
  const [repoUrl, setRepoUrl] = useState('');
  const [repoFiles, setRepoFiles] = useState([]);
  const [selectedFilePaths, setSelectedFilePaths] = useState(new Set());
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const fileInputRef = useRef(null);

  const filteredFindings = useMemo(() => {
  if (!analysisResult) return [];
  return analysisResult.findings.filter(finding => {
    const matchSeverity = filterSeverity === 'all' || finding.severity === filterSeverity;
    const matchType = filterType === 'all' || finding.type === filterType;
    return matchSeverity && matchType;
  });
}, [analysisResult, filterSeverity, filterType]);

// Obtener tipos únicos dinámicamente del reporte
const uniqueTypes = useMemo(() => {
  if (!analysisResult) return ['all'];
  const types = analysisResult.findings.map(f => f.type);
  return ['all', ...new Set(types)];
}, [analysisResult]);

const folderCount = useMemo(() => {
  const folders = repoFiles
    .map(f => f.path.split('/').slice(0, -1).join('/')) // Extrae la ruta sin el archivo
    .filter(path => path !== ""); // Quita los archivos que están en la raíz
  return new Set(folders).size; // Cuenta carpetas únicas
}, [repoFiles]);

  // Conexión real con el Backend (Sprint 2)
  const handleConnect = async () => {
    if (!repoUrl) {
      alert("⚠️ Por favor, ingresa una URL de GitHub primero.");
      return;
    }

    setLoadingFiles(true); // ✅ Corregido (usando tu variable real)
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

      // Ahora data.files ya viene súper estructurado desde tu nuevo backend
      const archivosMapeados = data.files.map((archivo) => ({
        path: archivo.path,
        extension: archivo.extension,
        selected: true // Por defecto seleccionamos todos
      }));

      setRepoFiles(archivosMapeados);
      setSelectedFilePaths(new Set(archivosMapeados.map(f => f.path)));

      setRepoFiles(archivosMapeados); // ✅ Corregido (usando tu variable real)
      
      // ✅ Automáticamente seleccionamos todos los archivos
      setSelectedFilePaths(new Set(archivosMapeados.map(f => f.path)));

    } catch (err) {
      console.error("❌ Error en la conexión:", err);
      setError("No se pudo conectar con el backend. Verifica que la URL sea válida.");
    } finally {
      setLoadingFiles(false); // ✅ Corregido
    }
  };

  const toggleFileSelection = (path) => {
    const newSelection = new Set(selectedFilePaths);
    if (newSelection.has(path)) {
      newSelection.delete(path);
    } else {
      newSelection.add(path);
    }
    setSelectedFilePaths(newSelection);
  };

  const selectAll = () => {
    setSelectedFilePaths(new Set(repoFiles.map(f => f.path)));
  };

  const deselectAll = () => {
    setSelectedFilePaths(new Set());
  };

  const startAnalysis = async () => {
    if (selectedFilePaths.size === 0) return;
    
    setView('analyzing'); // Cambiamos a la pantalla de carga
    setError(null);

    try {
      // Enviamos la URL y la lista de archivos seleccionados
      const response = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_url: repoUrl,
          selected_files: Array.from(selectedFilePaths)
        }),
      });

      if (!response.ok) throw new Error("Error al procesar el análisis");

      const data = await response.json();
      console.log("📊 REPORTE RECIBIDO DEL BACKEND:", data); // <--- AGREGA ESTO
      setAnalysisResult(data);
      setView('results');
      
      setAnalysisResult(data); // Guardamos el JSON que viene de tu utils.py
      setView('results'); // Mostramos los resultados

    } catch (err) {
      console.error(err);
      setError("Error al conectar con el motor de IA.");
      setView('setup');
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newDocs = files.map(file => ({ name: file.name, status: 'processing' }));
    setUploadedDocs(prev => {
      const updated = [...prev, ...newDocs];
      setTimeout(() => {
        setUploadedDocs(current =>
          current.map(doc =>
            newDocs.find(n => n.name === doc.name) && doc.status === 'processing'
              ? { ...doc, status: 'processed' }
              : doc
          )
        );
      }, 1200);
      return updated;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeDoc = (index) => {
    setUploadedDocs(prev => prev.filter((_, i) => i !== index));
  };

  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    const newDocs = files.map(file => ({ name: file.name, status: 'processing' }));
    setUploadedDocs(prev => {
      const updated = [...prev, ...newDocs];
      setTimeout(() => {
        setUploadedDocs(current =>
          current.map(doc =>
            newDocs.find(n => n.name === doc.name) && doc.status === 'processing'
              ? { ...doc, status: 'processed' }
              : doc
          )
        );
      }, 1200);
      return updated;
    });
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
    
    {/* Panel Izquierdo (30% del ancho) */}
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
      <button 
        onClick={handleConnect}
        className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex justify-center items-center gap-2 shadow-md shadow-slate-200"
      >
        <ExternalLink size={14} /> Conectar Repositorio
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
        <p className="text-2xl font-bold text-blue-600">{selectedFilePaths.size}<span className="text-slate-300 text-lg">/{repoFiles.length}</span></p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-tight">Archivos Seleccionados</p>
      </div>
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
        <p className="text-2xl font-bold text-slate-800">{folderCount}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-tight">Carpetas detectadas</p>
      </div>
    </div>
  </section>

  {/* 3. CARD: ARQUITECTURA (Aquí va la que buscabas) */}
  <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
    <div className="flex items-center gap-3 mb-4">
      <div className="bg-slate-900 p-2 rounded-lg text-white"><FileText size={18} /></div>
      <h2 className="text-sm font-bold text-slate-800">Reglas de Arquitectura</h2>
    </div>
    
    {/* EL INPUT: Muy importante que esté aquí para que el ref funcione */}
    <input 
      type="file" 
      ref={fileInputRef} 
      onChange={handleFileChange} 
      multiple 
      accept=".pdf,.docx" 
      className="hidden" 
    />

    <div 
      className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer group"
      onClick={() => fileInputRef.current?.click()}
    >
      <Upload className="text-slate-400 group-hover:text-blue-500 mb-2 transition-colors" size={20} />
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
        {uploadedDocs.length > 0 ? `${uploadedDocs.length} subido(s)` : "Subir PDF o DOCX"}
      </p>
    </div>

    {/* Lista de archivos subidos para que el usuario sepa que sí se cargaron */}
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
                    {/* Spinner o check según estado */}
                    {doc.status === 'processing' ? (
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    ) : (
                      <CheckCircle size={15} className="text-green-500 flex-shrink-0" />
                    )}
 
                    {/* Badge de extensión */}
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                      doc.status === 'processed' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {doc.name.split('.').pop().toUpperCase()}
                    </span>
 
                    {/* Nombre del archivo */}
                    <span className={`text-[11px] font-medium truncate ${
                      doc.status === 'processed' ? 'text-green-900' : 'text-slate-600'
                    }`}>
                      {doc.name}
                    </span>
                  </div>
 
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {/* Etiqueta de estado */}
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${
                      doc.status === 'processed' ? 'text-green-500' : 'text-blue-400'
                    }`}>
                      {doc.status === 'processed' ? 'Listo ✓' : 'Procesando...'}
                    </span>
 
                    {/* Botón eliminar */}
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
        {/* Header del Explorador (Azul Marino) */}
        <div className="bg-[#0f172a] p-5 flex justify-between items-center">
          <div className="flex items-center gap-3 text-white">
            <Folder size={18} className="text-blue-400" />
            <h3 className="text-sm font-bold tracking-wide">Explorador de Archivos</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
              <button onClick={selectAll} className="text-slate-400 hover:text-white transition-colors">Seleccionar todos</button>
              <button onClick={deselectAll} className="text-slate-400 hover:text-white transition-colors">Limpiar</button>
            </div>
            <div className="bg-blue-600 text-white text-[11px] font-bold px-3 py-1 rounded-full">
              {selectedFilePaths.size} / {repoFiles.length}
            </div>
          </div>
        </div>

        {/* Buscador de Archivos */}
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

        {/* Lista de Archivos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {repoFiles.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                <Folder size={48} className="mb-2" />
                <p className="text-xs font-medium italic">Sin archivos cargados</p>
             </div>
          ) : (
            repoFiles.map((file, idx) => (
              <div 
                key={idx} 
                onClick={() => toggleFileSelection(file.path)}
                className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${selectedFilePaths.has(file.path) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 hover:border-slate-300'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded flex items-center justify-center border ${selectedFilePaths.has(file.path) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                    {selectedFilePaths.has(file.path) && <CheckCircle size={12} className="text-white" />}
                  </div>
                  <div className="bg-slate-100 p-1.5 rounded text-[10px] font-bold text-slate-500 uppercase">
                    {file.extension.replace('.', '') || 'FILE'}
                  </div>
                  <span className="text-xs font-medium text-slate-700">{file.path}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                   {file.path.split('/')[0]}/
                </span>
              </div>
            ))
          )}
        </div>

        {/* Botón de Acción Flotante */}
        {repoFiles.length > 0 && (
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button 
              onClick={startAnalysis}
              disabled={selectedFilePaths.size === 0}
              className={`px-8 py-3.5 rounded-xl font-bold text-xs flex items-center gap-3 transition-all shadow-lg active:scale-95 ${selectedFilePaths.size > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
            >
              <Zap size={16} fill="currentColor" />
              ANALIZAR SELECCIÓN
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
      <Header />
      <main className="flex-1 px-8 py-10 flex flex-col justify-center">
        {view === 'setup' && <SetupView />}
        {view === 'analyzing' && (
           <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in zoom-in duration-500">
             <div className="relative">
               <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <Github className="text-blue-600 animate-pulse" size={32} />
               </div>
             </div>
             <div className="text-center">
               <h2 className="text-3xl font-black text-slate-800 tracking-tight italic">Analizando Selección...</h2>
               <p className="text-slate-400 mt-2 font-medium">Procesando {selectedFilePaths.size} archivos críticos.</p>
             </div>
           </div>
        )}
        {view === 'results' && <ResultsView />}
      </main>
      <Footer />
      
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