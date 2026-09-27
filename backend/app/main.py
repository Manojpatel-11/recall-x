from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config.settings import settings
from app.api.routes import router as api_router
from app.memory.hindsight_client import hindsight_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await hindsight_client.close()


app = FastAPI(
    title="RECALL-X API",
    description="An AI Agent That Remembers Why Experiments Failed — Before You Repeat Them",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "name": "RECALL-X",
        "tagline": "An AI Agent That Remembers Why Experiments Failed — Before You Repeat Them",
        "version": "1.0.0",
        "docs": "/docs"
    }