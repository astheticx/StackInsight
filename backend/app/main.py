from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.repositories import router as repositories_router

app = FastAPI(
    title="StackInsight API",
    description="AI-Powered DevSecOps Security Analysis Platform",
    version="0.2.0",
)

# Allow requests from the local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────────
app.include_router(repositories_router)


# ── Phase 1 health check (unchanged) ────────────────────────────────────────
@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "StackInsight API"}