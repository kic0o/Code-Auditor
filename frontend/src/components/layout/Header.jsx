import { Github, CheckCircle } from 'lucide-react';

function Header({ userGithubToken }) {
  return (
    <nav className="bg-[#0f172a] px-8 py-3 flex justify-between items-center sticky top-0 z-20 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Github className="text-white" size={20} />
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-4xl font-bold text-white tracking-tight">AI Code Auditor</h1>
          <span className="text-[14px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">V1.0</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {userGithubToken && (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full">
            <CheckCircle size={14} className="text-green-400" />
            <span className="text-[13px] font-bold text-green-300">Autenticado</span>
          </div>
        )}
        <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center text-slate-300 font-bold text-base border border-slate-700">
          ES
        </div>
      </div>
    </nav>
  );
}

export default Header;