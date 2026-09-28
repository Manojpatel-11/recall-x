from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime

from app.models.experiment import (
    ExperimentCreate,
    ExperimentUpdate,
    ExperimentResponse,
    ExperimentListResponse,
    PreflightRequest,
    PreflightResponse,
    RecallRequest,
    RecallResponse,
    OutcomeType
)
from app.memory.experiment_store import experiment_store
from app.reasoning.preflight import preflight_engine
from app.memory.hindsight_client import hindsight_client


router = APIRouter(prefix="/api", tags=["experiments"])


@router.get("/health")
async def health_check():
    hindsight_healthy = await hindsight_client.health_check()
    return {
        "status": "healthy" if hindsight_healthy else "degraded",
        "hindsight": "connected" if hindsight_healthy else "disconnected",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.post("/experiments", response_model=ExperimentResponse)
async def create_experiment(experiment: ExperimentCreate):
    try:
        stored = await experiment_store.store_experiment(experiment)
        return stored
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store experiment: {str(e)}")


@router.get("/experiments", response_model=ExperimentListResponse)
async def list_experiments(limit: int = 50, offset: int = 0):
    try:
        experiments = await experiment_store.get_all_experiments(limit=limit)
        return ExperimentListResponse(
            experiments=experiments[offset:offset+limit],
            total=len(experiments)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list experiments: {str(e)}")


@router.get("/experiments/{experiment_id}", response_model=ExperimentResponse)
async def get_experiment(experiment_id: str):
    try:
        experiments = await experiment_store.get_all_experiments(limit=1000)
        for exp in experiments:
            if exp.id == experiment_id or exp.memory_id == experiment_id:
                return exp
        raise HTTPException(status_code=404, detail="Experiment not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get experiment: {str(e)}")


@router.post("/preflight", response_model=PreflightResponse)
async def run_preflight(request: PreflightRequest):
    try:
        result = await preflight_engine.run_preflight(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preflight failed: {str(e)}")


@router.post("/recall", response_model=RecallResponse)
async def recall_memory(request: RecallRequest):
    try:
        experiments = await experiment_store.search_experiments(request.query, limit=request.limit)
        memories = []
        for exp in experiments:
            memories.append({
                "id": exp.id,
                "text": f"{exp.title}: {exp.lesson}",
                "metadata": {
                    "title": exp.title,
                    "outcome": exp.outcome.value,
                    "conditions": exp.conditions,
                    "lesson": exp.lesson,
                    "domain": exp.domain,
                    "tags": exp.tags
                },
                "score": getattr(exp, 'similarity_score', 0.0)
            })
        return RecallResponse(memories=memories, total=len(memories))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recall failed: {str(e)}")


@router.post("/ask")
async def ask_memory(question: str):
    try:
        result = await experiment_store.ask_memory(question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ask failed: {str(e)}")


@router.get("/stats")
async def get_stats():
    try:
        experiments = await experiment_store.get_all_experiments(limit=1000)
        total = len(experiments)
        successful = len([e for e in experiments if e.outcome == OutcomeType.SUCCESS])
        failed = len([e for e in experiments if e.outcome == OutcomeType.FAILURE])
        partial = len([e for e in experiments if e.outcome == OutcomeType.PARTIAL])
        unknown = len([e for e in experiments if e.outcome == OutcomeType.UNKNOWN])
        lessons = len([e for e in experiments if e.lesson])

        recent = sorted(experiments, key=lambda x: x.timestamp, reverse=True)[:5]

        return {
            "total_experiments": total,
            "successful": successful,
            "failed": failed,
            "partial": partial,
            "unknown": unknown,
            "lessons_learned": lessons,
            "recent_experiments": [
                {
                    "id": e.id,
                    "title": e.title,
                    "outcome": e.outcome.value,
                    "timestamp": e.timestamp.isoformat(),
                    "lesson": e.lesson[:100] + "..." if len(e.lesson) > 100 else e.lesson
                }
                for e in recent
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats failed: {str(e)}")