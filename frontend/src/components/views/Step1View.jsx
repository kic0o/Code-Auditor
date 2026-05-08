import { Github, CheckCircle, Search, ExternalLink, Zap } from 'lucide-react';
import { GITHUB_AUTH_URL } from '../../constants/analysisConfig';

function Step1View({ repoUrl, setRepoUrl, handleConnect, loadingFiles, error, userGithubToken }) {
  
  // Condición estricta: No puede analizar si está cargando, si no hay URL, o si no hay Token
  const canAnalyze = !loadingFiles && !!repoUrl && !!userGithubToken;

  return (
    <div className="flex justify-center items-center flex-1">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Cabecera Dinámica */}
        <div className="text-center mb-8">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl transition-colors relative ${
            userGithubToken ? 'bg-green-600 shadow-green-200' : 'bg-[#0f172a] shadow-slate-200'
          }`}>
            <Github className="text-white" size={28} />
            {userGithubToken && (
              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-white">
                <CheckCircle size={12} className="text-white" />
              </div>
            )}
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Preparar Análisis</h2>
          <p className="text-slate-400 text-lg mt-1">Sigue los pasos para comenzar</p>
        </div>

        <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-7">
          
          {/* PASO 1: Autenticación */}
          <div>
            <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="bg-slate-100 text-slate-500 w-5 h-5 rounded flex items-center justify-center text-xs">1</span>
              Vincular Cuenta
            </label>
            
            {!userGithubToken ? (
              // Botón de Login (Lleva al backend para iniciar el OAuth)
              <a href={GITHUB_AUTH_URL} className="w-full py-3.5 px-4 bg-[#24292e] hover:bg-black text-white text-base font-bold rounded-xl transition-all flex items-center justify-center gap-3 shadow-md shadow-slate-200">
                <Github size={18} /> Iniciar Sesión con GitHub
              </a>
            ) : (
              // Estado de Éxito
              <div className="flex items-center justify-between px-4 py-3.5 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
                  <CheckCircle size={18} /> Cuenta vinculada correctamente
                </div>
              </div>
            )}
          </div>

          {/* PASO 2: Instalación de App */}
          <div>
            <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="bg-slate-100 text-slate-500 w-5 h-5 rounded flex items-center justify-center text-xs">2</span>
              Es necesario instalar nuestra GitHub App
            </label>
            <a href="https://github.com/apps/Linter-Logic-App" target="_blank" rel="noreferrer" className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-sm transition-all">
              <ExternalLink size={16} /> Instalar GitHub App
            </a>
          </div>

          <div className="h-px w-full bg-slate-100" />

          {/* PASO 3: URL y Conexión */}
          <div>
            <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="bg-slate-100 text-slate-500 w-5 h-5 rounded flex items-center justify-center text-xs">3</span>
              Repositorio a evaluar
            </label>
            <div className="relative mb-4">
              <input
                type="text"
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canAnalyze && handleConnect()}
                placeholder="https://github.com/usuario/repo"
                disabled={!userGithubToken} // Bloquea el input si no hay sesión
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
            </div>

            {error && (
              <p className="mb-4 text-sm text-red-500 font-bold px-3 py-2 bg-red-50 rounded-xl border border-red-100">
                {error}
              </p>
            )}

            {/* Botón Principal (Bloqueado por defecto) */}
            <button
              onClick={handleConnect}
              disabled={!canAnalyze}
              className={`w-full py-3.5 text-white text-base font-bold rounded-xl transition-all flex justify-center items-center gap-2 shadow-md ${
                !canAnalyze
                  ? 'bg-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 active:scale-95'
              }`}
            >
              {loadingFiles
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Zap size={16} />}
              
              {/* Texto dinámico para guiar al usuario */}
              {loadingFiles 
                ? 'Conectando...' 
                : !userGithubToken 
                  ? 'Completa el Paso 1' 
                  : !repoUrl
                    ? 'Ingresa una URL'
                    : 'Conectar Repositorio'}
            </button>
          </div>
          
        </section>
      </div>
    </div>
  );
}

export default Step1View;