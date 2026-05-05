import { useRef } from 'react';
import { Github, CheckCircle, Zap, FileText, Search, Folder, Upload, X, Check } from 'lucide-react';
import { ANALYSIS_CATEGORIES } from '../../constants/analysisConfig';


const EXTENSION_COLORS = {
  ".py":   { bg: "#3b82f620", border: "#3b82f6", label: "PY" },
  ".js":   { bg: "#f59e0b20", border: "#f59e0b", label: "JS" },
  ".jsx":  { bg: "#06b6d420", border: "#06b6d4", label: "JSX" },
  ".ts":   { bg: "#3b82f620", border: "#3b82f6", label: "TS" },
  ".tsx":  { bg: "#06b6d420", border: "#06b6d4", label: "TSX" },
  ".css":  { bg: "#a855f720", border: "#a855f7", label: "CSS" },
  ".html": { bg: "#f9731620", border: "#f97316", label: "HTML" }, 
  ".json": { bg: "#22c55e20", border: "#22c55e", label: "JSON" },
  ".md":   { bg: "#6b708020", border: "#6b7080", label: "MD" },
};

const DEFAULT_COLOR = { bg: "#6b708020", border: "#6b7080", label: "FILE" };


function Step2View({
  repoUrl, handleReset, repoFiles, error,
  selectedFilesCount, totalSelectionsCount, categorySelectionCounts,
  selectedFileMatrix, toggleCategorySelection, selectAllForCategory,
  clearCategory, selectFileForAllCategories, clearFileFromAllCategories,
  uploadedDocs, isDraggingFiles, setIsDraggingFiles, processDroppedFiles,
  removeDoc, startAnalysis, setError
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    processDroppedFiles(e.target.files, setError);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1400px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Panel izquierdo */}
      <div className="lg:col-span-4 space-y-6">

        {/* Repo conectado */}
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
          <button onClick={handleReset} className="mt-3 text-[14px] font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-wider">
            ← Cambiar repositorio
          </button>
        </section>

        {/* Resumen */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-slate-900 p-2 rounded-lg text-white"><Zap size={18} /></div>
            <h2 className="text-lg font-bold text-slate-800">Resumen del Repo</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-5xl font-bold text-blue-600">
                {selectedFilesCount}<span className="text-slate-300 text-4xl">/{repoFiles.length}</span>
              </p>
              <p className="text-[14px] font-bold text-slate-400 uppercase tracking-tighter leading-tight">Archivos En Matriz</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-5xl font-bold text-slate-800">{totalSelectionsCount}</p>
              <p className="text-[14px] font-bold text-slate-400 uppercase tracking-tighter leading-tight">Asignaciones Totales</p>
            </div>
          </div>
        </section>

        {/* Carga de documentos */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-slate-900 p-2 rounded-lg text-white"><FileText size={18} /></div>
            <h2 className="text-lg font-bold text-slate-800">Carga de Documentos</h2>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept=".pdf,.docx,.txt" className="hidden" />
          <div
            className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDraggingFiles(true); }}
            onDragLeave={() => setIsDraggingFiles(false)}
            onDrop={e => { e.preventDefault(); setIsDraggingFiles(false); processDroppedFiles(e.dataTransfer.files, setError); }}
          >
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
                    {doc.status === 'processing'
                      ? <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      : <CheckCircle size={15} className="text-green-500" />}
                    <span className="text-[15px] font-medium truncate">{doc.name}</span>
                  </div>
                  <button onClick={() => removeDoc(i)} className="text-slate-300 hover:text-red-400">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Panel derecho — Matriz */}
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
                <Folder size={48} className="mb-2" />
                <p className="text-base font-medium italic">Sin archivos</p>
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
                  
                  // Rescatamos el color correspondiente o usamos el color por defecto
                  const extKey = file.extension?.toLowerCase() || '';
                  const badgeColor = EXTENSION_COLORS[extKey] || DEFAULT_COLOR;

                  return (
                    <div key={idx} className={`grid grid-cols-[minmax(0,2.4fr)_repeat(4,minmax(88px,1fr))_110px] gap-2 rounded-2xl border p-3 transition-all ${inAny ? 'bg-blue-50/60 border-blue-200' : 'bg-white border-slate-100'}`}>
                      <div className="flex min-w-0 items-center gap-3">
                        
                        {/* INSIGNIA DE COLOR RESCATADA */}
                        <div 
                          className="p-1.5 rounded text-[13px] font-black text-center min-w-[42px] tracking-wider"
                          style={{
                            backgroundColor: badgeColor.bg,
                            border: `1px solid ${badgeColor.border}`,
                            color: badgeColor.border
                          }}
                        >
                          {badgeColor.label}
                        </div>

                        <span className="truncate text-base font-medium text-slate-700">{file.path}</span>
                      </div>
                      
                      {ANALYSIS_CATEGORIES.map(c => {
                        const isSel = selectedFileMatrix[c.id].has(file.path);
                        return (
                          <button key={c.id} onClick={() => toggleCategorySelection(file.path, c.id)}
                            className={`flex h-10 items-center justify-center rounded-xl border transition-all ${isSel ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-400 hover:border-blue-300'}`}>
                            {isSel ? <Check size={14} /> : <span className="text-[14px] font-bold">+</span>}
                          </button>
                        );
                      })}
                      
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => selectFileForAllCategories(file.path)} className="rounded-lg border border-slate-200 px-2 py-1 text-[14px] font-bold text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors">Todas</button>
                        <button onClick={() => clearFileFromAllCategories(file.path)} className="rounded-lg border border-slate-200 px-2 py-1 text-[14px] font-bold text-slate-500 hover:border-red-300 hover:text-red-500 transition-colors">Limpiar</button>
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
              {selectedFilesCount === 0
                ? 'Asigna archivos a la matriz para continuar'
                : selectedFilesCount > 10
                  ? `⚠️ Máximo 10 archivos (tienes ${selectedFilesCount})`
                  : `${selectedFilesCount} archivo${selectedFilesCount > 1 ? 's' : ''} listo${selectedFilesCount > 1 ? 's' : ''}`}
            </p>
            
            {/* LÍMITE DE ARCHIVOS CORREGIDO (Alerta Amarilla) */}
            <button
              onClick={startAnalysis}
              disabled={selectedFilesCount === 0 || selectedFilesCount > 10}
              className={`px-8 py-3.5 rounded-xl font-bold text-base flex items-center gap-3 transition-all shadow-lg ${selectedFilesCount > 0 && selectedFilesCount <= 10 ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'}`}
            >
              <Zap size={16} fill="currentColor" /> ANALIZAR MATRIZ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Step2View;