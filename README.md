# StackInsight

**AI-Powered DevSecOps Security Analysis Platform**

A university capstone project — monorepo containing a FastAPI backend and a React/Vite frontend.

---

## Project Structure

```
StackInsight/
├── backend/          # FastAPI Python backend
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/         # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   └── NewScan.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── vite.config.js
├── .gitignore
└── README.md
```

---

## Getting Started

### Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the development server
uvicorn app.main:app --reload --port 8000
```

The API will be available at: http://localhost:8000  
Health check: http://localhost:8000/api/health

### Frontend

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start the Vite dev server
npm run dev
```

The app will be available at: http://localhost:5173

---

## API Endpoints (Phase 1)

| Method | Endpoint      | Description   |
|--------|---------------|---------------|
| GET    | /api/health   | Health check  |

---

## Phases

- **Phase 1** ✅ — Project foundation (backend + frontend scaffold, health check)
- Phase 2 — GitHub OAuth & repository integration
- Phase 3 — Security scanning (Semgrep, OSV-Scanner, Checkov)
- Phase 4 — AI analysis with Gemini
- Phase 5 — PostgreSQL persistence & reporting
