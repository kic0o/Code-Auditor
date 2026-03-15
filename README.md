# 🔍 Auditor de Código con IA

Herramienta web que analiza la calidad, seguridad y coherencia arquitectónica de repositorios de GitHub de forma automatizada usando inteligencia artificial.

---

## ✨ ¿Qué hace?

- Analiza un repositorio de GitHub en busca de vulnerabilidades y malas prácticas
- Infiere las reglas de negocio implícitas en el código
- Lee documentos de arquitectura (PDF/DOCX) para enriquecer el análisis
- Propone cambios que el equipo puede aprobar, aplicándolos como Pull Request automático

---

## 🏗️ Arquitectura

```
Frontend (React + Vite)
        ↓
Agente Central (Orquestador Python)
        ↓
┌───────────────────────────────────────┐
│  GitHub Tool │ Analyzer │ Rules │ Doc │
└───────────────────────────────────────┘
        ↓
      LLM API
```

---

## 🚀 Cómo correr el proyecto

### Requisitos previos
- Python 3.10+
- Node.js 18+
- Una cuenta en GitHub con un token personal

---

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/TU_REPO.git
cd TU_REPO
```

### 2. Configurar el Backend

```bash
cd backend
pip install -r requirements.txt
```

Crea tu archivo `.env` copiando el ejemplo:

```bash
cp .env.example .env
```

Abre `.env` y llena tus valores:

```
GITHUB_TOKEN=tu_token_aqui
LLM_API_KEY=tu_api_key_aqui
```

Corre el servidor:

```bash
uvicorn main:app --reload
```

El backend queda disponible en `http://localhost:8000`

---

### 3. Configurar el Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend queda disponible en `http://localhost:5173`

---

## 📁 Estructura del proyecto

```
code-auditor/
├── backend/
│   ├── main.py              ← API principal (FastAPI)
│   ├── tools/
│   │   └── github_tool.py   ← Conexión con GitHub API
│   ├── requirements.txt
│   └── .env.example         ← Plantilla de variables de entorno
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── components/
│   │       ├── RepoInput.jsx
│   │       └── StatusCard.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

## 🗓️ Sprints

| Sprint | Semana | Objetivo |
|--------|--------|----------|
| 1 | 1 | Setup, Hello World con LLM, input de URL |
| 2 | 2 | GitHub Tool, leer archivos del repo |
| 3 | 3 | Analyzer Tool — análisis de 1 archivo |
| 4 | 4 | Analyzer Tool — repo completo |
| 5 | 5 | Doc Parser (PDF/DOCX) |
| 6 | 6 | Rules Tool — reglas de negocio |
| 7 | 7 | Orquestador — flujo completo |
| 8 | 8 | Generación y visualización de cambios |
| 9 | 9 | Aplicar cambios y crear Pull Request |
| 10 | 10 | Pruebas y corrección de bugs |
| 11 | 11 | Pulido de UI/UX y optimización |
| 12 | 12 | Entrega final y demo |

---

## 👥 Equipo

| Nombre | Rol |
|--------|-----|
|        |     |
|        |     |
|        |     |
|        |     |
|        |     |
|        |     |
|        |     |
|        |     |

---

## ⚠️ Importante

- **Nunca subas tu archivo `.env`** al repositorio
- Cada integrante debe crear su propio `.env` local a partir de `.env.example`
- Antes de trabajar siempre haz `git pull` para tener la versión más reciente
