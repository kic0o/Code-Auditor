import React from 'react';
import { ChevronRight, CheckCircle } from 'lucide-react';
import { WIZARD_STEPS } from '../../constants/analysisConfig';

function WizardBar({ currentStep }) {
  return (
    <div className="bg-white border-b border-slate-100 px-6 py-3">
      <div className="max-w-[1400px] mx-auto flex items-center justify-center">
        {WIZARD_STEPS.map((step, i) => {
          const Icon = step.icon;
          const isDone   = currentStep > step.id;
          const isActive = currentStep === step.id;
          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                  isDone   ? 'bg-blue-600 shadow-sm shadow-blue-200' :
                  isActive ? 'bg-[#0f172a] shadow-sm shadow-slate-300' : 'bg-slate-100'
                }`}>
                  {isDone
                    ? <CheckCircle size={14} className="text-white" />
                    : <Icon size={12} className={isActive ? 'text-white' : 'text-slate-400'} />}
                </div>
                <div className="hidden sm:block">
                  <p className={`text-[13px] font-black uppercase tracking-widest leading-none mb-0.5 ${
                    isDone ? 'text-blue-600' : isActive ? 'text-slate-800' : 'text-slate-400'
                  }`}>Paso {step.id}</p>
                  <p className={`text-[14px] font-semibold leading-none ${
                    isDone ? 'text-blue-500' : isActive ? 'text-slate-700' : 'text-slate-400'
                  }`}>{step.label}</p>
                </div>
              </div>
              {i < WIZARD_STEPS.length - 1 && (
                <div className="flex items-center mx-2" style={{ minWidth: '20px', maxWidth: '60px', flex: 1 }}>
                  <div className="w-full h-[2px] rounded-full overflow-hidden bg-slate-100">
                    <div className="h-full bg-blue-600 transition-all duration-500"
                      style={{ width: currentStep > step.id ? '100%' : '0%' }} />
                  </div>
                  <ChevronRight size={12} className={`flex-shrink-0 -ml-1 ${currentStep > step.id ? 'text-blue-400' : 'text-slate-200'}`} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default WizardBar;
