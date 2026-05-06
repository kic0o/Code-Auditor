import { ShieldAlert, AlertCircle, Info, CheckCircle, X, Check, ChevronRight, ArrowLeft, FileText, Zap } from 'lucide-react';
import ScoreRing from '../shared/ScoreRing';
import { ANALYSIS_CATEGORIES } from '../../constants/analysisConfig';

function ResultsView({
  analysisResult, currentReviewIndex, currentReviewCategory,
  findingsByCategory, findingDecisions, categoryStats, reportStats,
  isCategoryCompleted, reviewCompleted, selectedFileMatrix,
  toggleFindingDecision, advanceToNextCategory, handleReset,
  enviarDecisionesAlBackend, isSendingToBackend, getFindingId,
  allFindings, onGoToCategory
}) {
  if (!analysisResult) return null;

  const activeCategory = currentReviewCategory || ANALYSIS_CATEGORIES[0];
  const currentCategoryFindings = findingsByCategory[activeCategory.id] || [];
  
  // Usamos selectedFileMatrix en lugar de pasar vacío para verificar completitud
  const isCurrentCategoryDone = isCategoryCompleted(activeCategory.id, selectedFileMatrix);
  const isAllReviewCompleted = reviewCompleted(selectedFileMatrix);
  const nextSelectedCategoryIndex = ANALYSIS_CATEGORIES.findIndex(
    (category, index) => index > currentReviewIndex && selectedFileMatrix[category.id].size > 0
  );
  const shouldGoToFinalSummary = nextSelectedCategoryIndex === -1;

  // Función para navegar entre categorías desde el menú lateral
  return (
    <div className="max-w-7xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER SUPERIOR */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-[#0f172a] px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Revisión Guiada del Análisis</h2>
            <p className="text-slate-400 text-base mt-0.5">Evalúa cada hallazgo y decide si aceptas los cambios sugeridos</p>
          </div>
          <div className="flex items-center gap-2 text-base font-bold text-slate-400 bg-slate-800/50 px-4 py-2 rounded-xl">
            <span className="text-white">{ANALYSIS_CATEGORIES.filter(c => isCategoryCompleted(c.id, selectedFileMatrix)).length}</span>
            <span>/</span>
            <span>{ANALYSIS_CATEGORIES.length} aspectos revisados</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 border-t border-slate-100">
          <div className="flex flex-col items-center justify-center py-6 px-4">
            <ScoreRing score={analysisResult.total_score || 100} />
            <p className="text-[14px] font-black text-slate-400 uppercase tracking-widest mt-2">Score Global</p>
          </div>
          <div className="flex flex-col items-center justify-center py-6 px-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-2">
              <FileText size={24} className="text-blue-500" />
            </div>
            <span className="text-5xl font-black text-slate-700">{reportStats.affectedFiles}</span>
            <span className="text-[14px] font-bold text-slate-400 uppercase tracking-wide">Archivos Afectados</span>
            <p className="text-[13px] text-slate-400 text-center mt-1">{reportStats.affectedPct}% del proyecto total</p>
          </div>
        </div>
      </div>

      {/* CUERPO: Menú Lateral + Contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ASIDE (MENÚ LATERAL) */}
        <aside className="lg:col-span-4">
          <div className="bg-transparent space-y-3 sticky top-24">
            <h3 className="text-[15px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 mb-4">Submenú de Revisión</h3>
            
            {ANALYSIS_CATEGORIES.map((category, index) => {
              const isActive = currentReviewIndex === index;
              const isDone   = isCategoryCompleted(category.id, selectedFileMatrix);
              const stats    = categoryStats[category.id] || { total: 0 };
              const Icon     = category.icon;
              
              return (
                <button key={category.id} type="button" onClick={() => onGoToCategory(index)}
                  className={`w-full text-left rounded-[1.5rem] border p-5 transition-all ${
                    isActive ? 'border-blue-300 bg-blue-50/50 shadow-sm' :
                    isDone   ? 'border-slate-200 bg-white' :
                               'border-slate-200 bg-white/60 hover:border-slate-300'
                  }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-blue-100' : isDone ? 'bg-green-100' : 'bg-slate-100'
                      }`}>
                        <Icon size={14} className={isActive ? 'text-blue-600' : isDone ? 'text-green-600' : 'text-slate-400'} />
                      </div>
                      <div>
                        <p className="text-[13px] font-black uppercase tracking-widest text-slate-400">Aspecto {index + 1}</p>
                        <h4 className={`text-lg font-bold leading-tight ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>{category.label}</h4>
                      </div>
                    </div>
                    {isDone ? (
                      <span className="text-[13px] font-black uppercase px-2 py-1 rounded-lg bg-green-100 text-green-700 flex-shrink-0">✓ Listo</span>
                    ) : isActive ? (
                      <span className="text-[13px] font-black uppercase px-2 py-1 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">Actual</span>
                    ) : null}
                  </div>
                  <div className="pl-[42px]">
                    {stats.total > 0 ? (
                      <span className="text-[14px] font-bold text-slate-500">{stats.total} problemas detectados</span>
                    ) : (
                      <span className="text-[14px] font-bold text-green-500">Todo en orden ✓</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* SECCIÓN DERECHA (TARJETAS) */}
        <section className="lg:col-span-8 space-y-5">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-5">
            {!isAllReviewCompleted ? (
              <>
                <div className="border-b border-slate-100 pb-5 mb-5 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                  <div>
                    <p className="text-[14px] font-black uppercase tracking-[0.2em] text-blue-500 mb-1">Revisión en progreso</p>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">{activeCategory.label}</h3>
                  </div>
                  <div className="text-left md:text-right bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
                    <span className="text-[15px] font-bold text-slate-500 uppercase tracking-widest">
                      {currentCategoryFindings.length} hallazgo{currentCategoryFindings.length !== 1 ? 's' : ''} en total
                    </span>
                  </div>
                </div>

                {currentCategoryFindings.length > 0 ? (
                  <div className="space-y-4">
                    {currentCategoryFindings.map((finding, index) => {
                      const findingId = getFindingId(finding, index);
                      const decision = findingDecisions[findingId];
                      const isC = finding.severity === 'critical';
                      const isW = finding.severity === 'warning';
                      
                      return (
                        <div key={findingId} className={`rounded-2xl border overflow-hidden shadow-sm transition-all ${
                          decision === 'accepted' ? 'border-green-300 shadow-green-50' :
                          decision === 'rejected' ? 'border-red-300 shadow-red-50' :
                          isC ? 'border-red-200' : isW ? 'border-amber-200' : 'border-blue-200'
                        }`}>
                          <div className={`px-5 py-2 flex items-center justify-between ${
                            decision === 'accepted' ? 'bg-green-50' :
                            decision === 'rejected' ? 'bg-red-50' :
                            isC ? 'bg-red-50' : isW ? 'bg-amber-50' : 'bg-blue-50'
                          }`}>
                            <div className="flex items-center gap-2">
                              {isC ? <ShieldAlert size={13} className="text-red-500" /> : isW ? <AlertCircle size={13} className="text-amber-500" /> : <Info size={13} className="text-blue-500" />}
                              <span className={`text-[14px] font-black uppercase tracking-widest ${isC ? 'text-red-600' : isW ? 'text-amber-600' : 'text-blue-600'}`}>
                                {isC ? 'Crítico' : isW ? 'Advertencia' : 'Informativo'}
                              </span>
                              {decision && (
                                <span className={`text-[13px] font-black uppercase px-2 py-0.5 rounded-full ml-2 ${decision === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                  {decision === 'accepted' ? '✓ Aceptado' : '✗ Rechazado'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] font-bold bg-white/70 px-2 py-0.5 rounded-lg text-slate-600 font-mono">{finding.file_path}</span>
                              {finding.line && <span className="text-[14px] font-bold bg-white/70 px-2 py-0.5 rounded-lg text-slate-500">Línea {finding.line}</span>}
                              <span className={`text-[14px] font-bold px-2 py-0.5 rounded-lg ${isC ? 'bg-red-100 text-red-700' : isW ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{finding.type}</span>
                            </div>
                          </div>
                          
                          <div className="bg-white p-5 space-y-3">
                            <h4 className="text-lg font-bold text-slate-800 leading-snug">{finding.title}</h4>
                            <p className="text-lg text-slate-500 leading-relaxed">{finding.description}</p>
                            
                            <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                              <span className="text-lg">💡</span>
                              <div>
                                <span className="text-[14px] font-black uppercase tracking-wide text-slate-400 block mb-0.5">Sugerencia</span>
                                <span className="text-lg text-slate-600">{finding.recommendation}</span>
                              </div>
                            </div>
                            
                            {(finding.original_code || finding.secure_code) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-[14px] font-black text-red-400 uppercase tracking-widest">
                                    <X size={10} /> Código Original
                                  </div>
                                  <pre className="bg-red-50/40 border border-red-100 p-4 rounded-xl text-[15px] font-mono text-red-800 overflow-x-auto whitespace-pre-wrap">
                                    <code>{finding.original_code || '# No hay código'}</code>
                                  </pre>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-[14px] font-black text-green-500 uppercase tracking-widest">
                                    <Check size={10} /> Código Corregido
                                  </div>
                                  <pre className="bg-green-50 border border-green-100 p-4 rounded-xl text-[15px] font-mono text-green-800 overflow-x-auto whitespace-pre-wrap shadow-inner">
                                    <code>{finding.secure_code || '# Sin cambios'}</code>
                                  </pre>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex gap-3 pt-3 border-t border-slate-100">
                              <button onClick={() => toggleFindingDecision(findingId, 'rejected')}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-base flex justify-center items-center gap-2 transition-all ${
                                  decision === 'rejected' ? 'bg-red-500 text-white shadow-md shadow-red-200' : 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600'
                                }`}>
                                <X size={13} /> Rechazar Corrección
                              </button>
                              <button onClick={() => toggleFindingDecision(findingId, 'accepted')}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-base flex justify-center items-center gap-2 transition-all ${
                                  decision === 'accepted' ? 'bg-green-500 text-white shadow-md shadow-green-200' : 'bg-slate-100 text-slate-500 hover:bg-green-50 hover:text-green-600'
                                }`}>
                                <Check size={13} /> Aceptar Corrección
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl py-12 text-center">
                    <p className="text-slate-400 font-medium italic">No hay hallazgos para este aspecto. Puedes avanzar.</p>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-slate-100 pt-5 mt-6">
                  <button onClick={handleReset} className="flex items-center gap-2 text-slate-400 font-bold hover:text-blue-600 transition-colors text-lg">
                    <ArrowLeft size={16} /> Nuevo análisis
                  </button>
                  {!shouldGoToFinalSummary ? (
                    <button onClick={advanceToNextCategory} disabled={!isCurrentCategoryDone}
                      className={`px-8 py-3 rounded-xl font-bold text-lg flex items-center gap-2 transition-all ${
                        isCurrentCategoryDone ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}>
                      Siguiente Aspecto <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button onClick={advanceToNextCategory} disabled={!isCurrentCategoryDone}
                      className={`px-8 py-3 rounded-xl font-bold text-lg flex items-center gap-2 transition-all ${
                        isCurrentCategoryDone ? 'bg-[#0f172a] text-white shadow-lg shadow-slate-300 hover:bg-slate-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}>
                      Ver Resumen Final <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </>
            ) : (
              /* PANTALLA FINAL DE RESUMEN */
              <div className="space-y-6">
                <div className="text-center pb-4 border-b border-slate-100">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-5xl font-black text-slate-900 tracking-tight">Revisión Finalizada</h3>
                  <p className="text-slate-500 mt-1 text-lg">Has evaluado todos los hallazgos propuestos por la IA.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ANALYSIS_CATEGORIES.map(category => {
                    const stats = categoryStats[category.id] || { total: 0 };
                    const findings = findingsByCategory[category.id] || [];
                    const accepted = findings.filter((f, i) => findingDecisions[getFindingId(f, i)] === 'accepted').length;
                    const rejected = findings.filter((f, i) => findingDecisions[getFindingId(f, i)] === 'rejected').length;
                    const Icon = category.icon;
                    const wasAnalyzed = selectedFileMatrix[category.id].size > 0;

                    return (
                      <div key={category.id} className={`rounded-2xl border p-4 transition-all ${
                        wasAnalyzed ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/60'
                      }`}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            wasAnalyzed ? 'bg-slate-100' : 'bg-slate-200'
                          }`}>
                            <Icon size={13} className={wasAnalyzed ? 'text-slate-500' : 'text-slate-400'} />
                          </div>
                          <p className={`text-lg font-bold ${wasAnalyzed ? 'text-slate-800' : 'text-slate-400'}`}>
                            {category.label}
                          </p>
                          {!wasAnalyzed && (
                            <span className="ml-auto text-[11px] font-black uppercase px-2 py-0.5 rounded-lg bg-slate-200 text-slate-500 tracking-wide flex-shrink-0">
                              No analizado
                            </span>
                          )}
                        </div>

                        {wasAnalyzed ? (
                          <>
                            <div className="flex gap-3 mb-3">
                              {stats.total > 0
                                ? <span className="text-[14px] font-bold text-slate-500">{stats.total} problemas detectados</span>
                                : <span className="text-[14px] font-bold text-green-500">Sin hallazgos ✓</span>}
                            </div>
                            <div className="flex gap-3">
                              <div className="flex-1 text-center bg-green-50 rounded-xl py-2 border border-green-100">
                                <span className="text-4xl font-black text-green-600">{accepted}</span>
                                <p className="text-[13px] font-bold text-green-500 uppercase">Aceptados</p>
                              </div>
                              <div className="flex-1 text-center bg-red-50 rounded-xl py-2 border border-red-100">
                                <span className="text-4xl font-black text-red-500">{rejected}</span>
                                <p className="text-[13px] font-bold text-red-400 uppercase">Rechazados</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex gap-3 mb-3">
                              <span className="text-[14px] font-bold text-slate-400">No se asignaron archivos</span>
                            </div>
                            <div className="flex gap-3">
                              <div className="flex-1 text-center bg-slate-100 rounded-xl py-2 border border-slate-200">
                                <span className="text-4xl font-black text-slate-400">—</span>
                                <p className="text-[13px] font-bold text-slate-400 uppercase">Aceptados</p>
                              </div>
                              <div className="flex-1 text-center bg-slate-100 rounded-xl py-2 border border-slate-200">
                                <span className="text-4xl font-black text-slate-400">—</span>
                                <p className="text-[13px] font-bold text-slate-400 uppercase">Rechazados</p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-2xl border border-slate-200 p-4">
                  <div className="text-center">
                    <span className="text-5xl font-black text-green-600">
                      {ANALYSIS_CATEGORIES.reduce((t, cat) => t + (findingsByCategory[cat.id] || []).filter((f, i) => findingDecisions[getFindingId(f, i)] === 'accepted').length, 0)}
                    </span>
                    <p className="text-[14px] font-bold text-slate-400 uppercase mt-0.5">Total Aceptados</p>
                  </div>
                  <div className="text-center">
                    <span className="text-5xl font-black text-red-500">
                      {ANALYSIS_CATEGORIES.reduce((t, cat) => t + (findingsByCategory[cat.id] || []).filter((f, i) => findingDecisions[getFindingId(f, i)] === 'rejected').length, 0)}
                    </span>
                    <p className="text-[14px] font-bold text-slate-400 uppercase mt-0.5">Total Rechazados</p>
                  </div>
                  <div className="text-center">
                    <span className="text-5xl font-black text-slate-700">{allFindings.length || 0}</span>
                    <p className="text-[14px] font-bold text-slate-400 uppercase mt-0.5">Total Hallazgos</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center">
                  <p className="text-lg font-bold text-slate-600 mb-5">Estás a punto de inyectar las correcciones aceptadas a tu entorno virtual y crear el Pull Request.</p>
                  <button onClick={enviarDecisionesAlBackend} disabled={isSendingToBackend}
                    className="w-full md:w-auto px-10 py-4 rounded-2xl font-black text-lg flex items-center justify-center mx-auto gap-3 text-white bg-[#0f172a] hover:bg-slate-800 shadow-xl shadow-slate-300 transition-all active:scale-95">
                    {isSendingToBackend ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Zap size={18} />}
                    {isSendingToBackend ? 'Creando Pull Request...' : 'Aplicar Cambios'}
                  </button>
                </div>

                <button onClick={handleReset} className="block text-center w-full text-base font-bold text-slate-400 hover:text-blue-600 transition-colors">
                  Empezar un nuevo análisis
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default ResultsView;