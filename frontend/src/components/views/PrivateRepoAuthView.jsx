import { Github, CheckCircle, ShieldAlert, Search, ExternalLink } from 'lucide-react';
import { GITHUB_AUTH_URL } from '../../constants/analysisConfig';

function PrivateRepoAuthView({
  githubAuthorized, repoAccessMessage, repoUrl, setRepoUrl,
  handleConnect, loadingFiles, error, setShowPrivateRepoAuth
}) {
  return (
    <div className="flex justify-center items-center flex-1">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl ${
            githubAuthorized ? 'bg-green-600 shadow-green-200' : 'bg-[#24292e] shadow-slate-200'
          }`}>
            <Github className="text-white" size={28} />
          </div>
          <h2 className="text-5xl font-black text-slate-800 tracking-tight">
            {githubAuthorized ? 'GitHub Vinculado' : 'Repositorio Privado'}
          </h2>
          <p className="text-slate-400 text-lg mt-1">
            {githubAuthorized ? 'Tu cuenta está lista para crear Pull Requests.' : 'Autoriza el acceso para continuar.'}
          </p>
        </div>

        <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className={`flex items-start gap-3 p-4 rounded-xl border ${
            githubAuthorized ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <div className={`p-1.5 rounded-lg flex-shrink-0 ${
              githubAuthorized ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
            }`}>
              {githubAuthorized ? <CheckCircle size={18} /> : <ShieldAlert size={18} />}
            </div>
            <div>
              <p className={`text-[15px] font-black uppercase tracking-wider ${
                githubAuthorized ? 'text-green-700' : 'text-amber-700'
              }`}>
                {githubAuthorized ? 'Acceso vinculado' : 'Permisos requeridos'}
              </p>
              <p className={`text-base font-medium mt-1 leading-relaxed ${
                githubAuthorized ? 'text-green-900' : 'text-amber-900'
              }`}>
                {repoAccessMessage || 'Inicia sesión para permitir que la IA pueda crear Pull Requests en tu nombre.'}
              </p>
            </div>
          </div>

          <a
            href={GITHUB_AUTH_URL}
            className={`w-full py-4 text-white text-xl font-bold rounded-2xl transition-all flex justify-center items-center gap-3 shadow-md ${
              githubAuthorized
                ? 'bg-green-600 hover:bg-green-700 shadow-green-200'
                : 'bg-[#24292e] hover:bg-black shadow-slate-200'
            }`}
          >
            <Github size={20} />
            {githubAuthorized ? 'Volver a autorizar con GitHub' : 'Autorizar con GitHub'}
          </a>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[14px] font-black text-slate-300 uppercase tracking-[0.25em]">Siguiente paso</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[14px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                URL DEL REPOSITORIO
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={repoUrl}
                  onChange={e => setRepoUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConnect()}
                  placeholder="https://github.com/usuario/repo"
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
                <Search className="absolute left-3.5 top-4 text-slate-400" size={16} />
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
              className={`w-full py-4 rounded-2xl font-bold text-xl flex justify-center items-center gap-3 transition-all ${
                loadingFiles || !repoUrl
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {loadingFiles
                ? <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                : <ExternalLink size={18} />}
              {loadingFiles ? 'Verificando acceso...' : 'Continuar con el repositorio'}
            </button>

            <button
              type="button"
              onClick={() => setShowPrivateRepoAuth(false)}
              className="w-full text-base font-bold text-slate-400 hover:text-slate-700 transition-colors"
            >
              Volver al formulario normal
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default PrivateRepoAuthView;
