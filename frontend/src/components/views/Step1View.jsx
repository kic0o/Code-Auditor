import { Github, CheckCircle, Search, ExternalLink, ShieldAlert } from 'lucide-react';

function Step1View({ repoUrl, setRepoUrl, handleConnect, loadingFiles, error, userGithubToken, setShowPrivateRepoAuth }) {
  return (
    <div className="flex justify-center items-center flex-1">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#0f172a] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-slate-200 relative">
            <Github className="text-white" size={28} />
            {userGithubToken && (
              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-white">
                <CheckCircle size={12} className="text-white" />
              </div>
            )}
          </div>
          <h2 className="text-5xl font-black text-slate-800 tracking-tight">Conecta tu repositorio</h2>
          <p className="text-slate-400 text-lg mt-1">Ingresa la URL de GitHub para comenzar</p>
        </div>

        <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="space-y-4">
            <div>
              <label className="text-[14px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                URL DE GITHUB
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={repoUrl}
                  onChange={e => setRepoUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConnect()}
                  placeholder="https://github.com/..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
                <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
              </div>
            </div>

            {error && (
              <p className="text-base text-red-500 font-bold px-3 py-2 bg-red-50 rounded-xl border border-red-100">
                {error}
              </p>
            )}

            <button
              onClick={handleConnect}
              disabled={loadingFiles || !repoUrl}
              className={`w-full py-3.5 text-white text-lg font-bold rounded-xl transition-all flex justify-center items-center gap-2 shadow-md ${
                loadingFiles || !repoUrl
                  ? 'bg-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 active:scale-95'
              }`}
            >
              {loadingFiles
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <ExternalLink size={15} />}
              {loadingFiles ? 'Conectando...' : 'Analizar Repositorio'}
            </button>

            <div className="pt-2 border-t border-slate-100 mt-4">
              {!userGithubToken ? (
                <button
                  type="button"
                  onClick={() => setShowPrivateRepoAuth(true)}
                  className="w-full text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-2 transition-colors"
                >
                  <ShieldAlert size={14} /> Iniciar Sesión o Repo Privado
                </button>
              ) : (
                <p className="w-full text-sm font-bold text-green-600 text-center flex items-center justify-center gap-2">
                  <CheckCircle size={14} /> Conectado con GitHub
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Step1View;
