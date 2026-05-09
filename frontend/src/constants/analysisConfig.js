import { FileText, ShieldAlert, Check, Zap, Github, Folder, CheckCircle } from 'lucide-react';

export const REVIEW_UPLOAD_CONFIG = {
  documentation: {
    allowedExtensions: ['pdf', 'doc', 'docx', 'txt', 'md'],
  },
};

export const ANALYSIS_CATEGORIES = [
  { id: 'business_rules', label: 'Reglas de negocio',   shortLabel: 'Negocio',   icon: FileText    },
  { id: 'security',       label: 'Seguridad',           shortLabel: 'Seguridad', icon: ShieldAlert },
  { id: 'best_practices', label: 'Buenas prácticas',    shortLabel: 'Prácticas', icon: Check       },
  { id: 'software_logic', label: 'Lógica del software', shortLabel: 'Lógica',    icon: Zap         },
];

export const WIZARD_STEPS = [
  { id: 1, label: 'Conectar',    icon: Github      },
  { id: 2, label: 'Seleccionar', icon: Folder      },
  { id: 3, label: 'Analizar',    icon: Zap         },
  { id: 4, label: 'Negocio',     icon: FileText    },
  { id: 5, label: 'Seguridad',   icon: ShieldAlert },
  { id: 6, label: 'Prácticas',   icon: Check       },
  { id: 7, label: 'Lógica',      icon: Zap         },
  { id: 8, label: 'Resumen',     icon: CheckCircle },
];

export const GITHUB_AUTH_URL = 'https://code-auditor-backend.onrender.com';

export const getWizardStepForReviewIndex = (index) => 4 + index;
export const FINAL_REVIEW_STEP = 8;

export const createEmptyCategorySelection = () =>
  ANALYSIS_CATEGORIES.reduce((acc, c) => { acc[c.id] = new Set(); return acc; }, {});
