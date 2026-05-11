function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 px-8 py-4 mt-auto">
      <div className="max-w-7xl mx-auto flex justify-between items-center text-[14px] font-bold text-slate-400 uppercase tracking-widest">
        <div className="flex gap-6">
          <span>ESCOM - INGENIERÍA EN IA</span>
          <span>© 2026 AUDIT SYSTEM</span>
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
}

export default Footer;
