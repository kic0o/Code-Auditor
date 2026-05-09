// components/layout/Header.jsx
import { Github, CheckCircle, LogOut } from 'lucide-react'; // Añadimos LogOut icon

function Header({ userGithubToken, onLogout }) {
  return (
    <nav className="bg-[#0f172a] px-8 py-3 flex justify-between items-center sticky top-0 z-20 shadow-lg">
      <div className="flex items-center gap-3">
        {/* ... Logo y Título ... */}
      </div>

      <div className="flex items-center gap-4">
        {userGithubToken && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full">
              <CheckCircle size={14} className="text-green-400" />
              <span className="text-[13px] font-bold text-green-300">Autenticado</span>
            </div>
            
            {/* --- BOTÓN DE SALIR --- */}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors text-red-400 hover:text-red-300"
              title="Cerrar sesión de GitHub"
            >
              <LogOut size={14} />
              <span className="text-[13px] font-bold">Salir</span>
            </button>
          </div>
        )}
        
        {/* ... Icono de usuario/perfil ... */}
      </div>
    </nav>
  );
}

export default Header;