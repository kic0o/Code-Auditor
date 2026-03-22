import React, { useState, useRef, useMemo } from 'react';
import { 
  Github, FileText, Upload, Search, ChevronRight, Folder, File, 
  Play, CheckCircle, AlertCircle, ArrowLeft, Zap, ShieldAlert, Info, ExternalLink, X,
  CheckSquare, Square
} from 'lucide-react';

const App = () => {
  const [view, setView] = useState('setup'); // 'setup' | 'analyzing' | 'results'
  const [repoUrl, setRepoUrl] = useState('');
  const [repoFiles, setRepoFiles] = useState([]);
  const [selectedFilePaths, setSelectedFilePaths] = useState(new Set());
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState(null);
  
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const fileInputRef = useRef(null);

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

  const startAnalysis = () => {
    if (selectedFilePaths.size === 0) return;
    setView('analyzing');
    setTimeout(() => setView('results'), 2500);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newDocs = files.map(file => ({
      name: file.name,
      status: 'ready'
    }));
    setUploadedDocs(prev => [...prev, ...newDocs]);
  };

  const removeDoc = (index) => {
    setUploadedDocs(prev => prev.filter((_, i) => i !== index));
  };

  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    const newDocs = files.map(file => ({
      name: file.name,
      status: 'ready'
    }));
    setUploadedDocs(prev => [...prev, ...newDocs]);
  };

  // --- COMPONENTES DE INTERFAZ ---

  const Header = () => (
    <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
          <Github className="text-white" size={24} />
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">AI Code Auditor</h1>
          <span className="text-[10px] font-bold text-slate-400">V1.0</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100 shadow-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Gemini 1.5 Flash Conectado
        </div>
        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold border-2 border-white shadow-md ring-1 ring-slate-200">
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto w-full animate-in fade-in duration-700">
      
      {/* Panel Izquierdo */}
      <div className="lg:col-span-4 space-y-6">
        <section className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800">
            <Github size={20} className="text-slate-400" /> Repositorio de Código
          </h2>
          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">URL de GitHub</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/usuario/proyecto"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all text-sm font-medium"
                />
                <Search className="absolute left-4 top-3.5 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
              </div>
            </div>
            <button 
              onClick={handleConnect}
              disabled={loadingFiles || !repoUrl}
              className={`w-full py-4 text-white font-bold rounded-2xl transition-all shadow-xl flex justify-center items-center gap-2 ${loadingFiles ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#0f172a] hover:bg-slate-800 active:scale-95 shadow-slate-200'}`}
            >
              {loadingFiles ? "Sincronizando..." : "Conectar Repositorio"}
            </button>
            {error && <p className="text-xs text-red-500 font-bold px-2 py-1 bg-red-50 rounded-lg border border-red-100">{error}</p>}
          </div>
        </section>

        <section className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800">
            <FileText size={20} className="text-blue-500" /> Reglas de Arquitectura
          </h2>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept=".pdf,.docx" className="hidden" />
          <div 
            className="border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer group mb-6"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform mb-3">
              <Upload className="text-blue-500" size={24} />
            </div>
            <p className="text-sm font-bold text-slate-700">Subir PDF o DOCX</p>
          </div>
          <div className="space-y-3">
            {uploadedDocs.map((doc, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-blue-600" />
                  <span className="text-xs font-bold text-slate-600 line-clamp-1">{doc.name}</span>
                </div>
                <button onClick={() => removeDoc(i)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={14} /></button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Panel Derecho - Explorador con Selección */}
      <div className="lg:col-span-8 h-full">
        <div className="bg-white rounded-[2.5rem] shadow-[0_15px_50px_rgb(0,0,0,0.04)] border border-slate-100 h-[700px] flex flex-col relative overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-3">
                <Folder size={20} className="text-slate-400" /> Explorador
              </h3>
              {repoFiles.length > 0 && (
                <div className="flex items-center gap-2">
                  <button onClick={selectAll} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-tighter">Seleccionar todos</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={deselectAll} className="text-[10px] font-bold text-slate-400 hover:text-slate-500 uppercase tracking-tighter">Limpiar</button>
                </div>
              )}
            </div>
            {repoFiles.length > 0 && (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-black tracking-widest uppercase shadow-sm border border-blue-200">
                {selectedFilePaths.size} de {repoFiles.length} seleccionados
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {repoFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                  <Folder size={40} className="opacity-20" />
                </div>
                <p className="text-sm italic font-medium">Conecta un repositorio para visualizar los archivos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {repoFiles.map((file, idx) => {
                  const isSelected = selectedFilePaths.has(file.path);
                  return (
                    <div 
                      key={idx} 
                      onClick={() => toggleFileSelection(file.path)}
                      className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'bg-blue-50/50 border-blue-100' : 'hover:bg-slate-50 border-transparent'}`}
                    >
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <CheckSquare size={20} className="text-blue-600" />
                        ) : (
                          <Square size={20} className="text-slate-300 group-hover:text-slate-400" />
                        )}
                      </div>
                      <div className={`p-2 rounded-xl bg-white shadow-sm border border-slate-100 ${isSelected ? 'border-blue-200' : ''}`}>
                        <File size={18} className={file.extension === '.py' ? 'text-blue-500' : file.extension === '.js' ? 'text-yellow-500' : 'text-slate-400'} />
                      </div>
                      <span className={`text-sm font-mono tracking-tight font-medium ${isSelected ? 'text-blue-900' : 'text-slate-600'}`}>{file.path}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {repoFiles.length > 0 && (
            <div className="absolute inset-x-0 bottom-0 p-12 bg-gradient-to-t from-white via-white/80 to-transparent flex justify-center items-end pointer-events-none">
              <button 
                onClick={startAnalysis}
                disabled={selectedFilePaths.size === 0}
                className={`pointer-events-auto px-10 py-5 text-white font-black rounded-2xl transition-all flex items-center gap-4 shadow-xl group active:scale-95 ${selectedFilePaths.size > 0 ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-200' : 'bg-slate-300 cursor-not-allowed shadow-none'}`}
              >
                <Zap size={22} className={`fill-white ${selectedFilePaths.size > 0 ? 'animate-pulse' : ''}`} />
                ANALIZAR {selectedFilePaths.size} {selectedFilePaths.size === 1 ? 'ARCHIVO' : 'ARCHIVOS'}
                <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

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
        {view === 'results' && (
          <div className="max-w-7xl mx-auto w-full text-center space-y-8">
            <h2 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter">Análisis Finalizado</h2>
            <p className="text-slate-500">Se han auditado los archivos seleccionados bajo las reglas de negocio.</p>
            <button onClick={() => setView('setup')} className="text-blue-600 font-bold hover:underline">← Volver al explorador</button>
          </div>
        )}
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