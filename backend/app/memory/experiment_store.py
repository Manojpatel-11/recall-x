import json
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid

from app.memory.hindsight_client import hindsight_client
from app.models.experiment import ExperimentBase, ExperimentResponse, OutcomeType


class ExperimentStore:
    def __init__(self):
        self.client = hindsight_client

    def _experiment_to_content(self, exp: ExperimentBase) -> str:
        parts = [
            f"Experiment: {exp.title}",
            f"Situation: {exp.situation}",
            f"Hypothesis: {exp.hypothesis}",
            f"Action: {exp.action}",
            f"Conditions: {json.dumps(exp.conditions, indent=2)}",
            f"Observation: {exp.observation}",
            f"Outcome: {exp.outcome.value}",
            f"Side Effects: {', '.join(exp.side_effects) if exp.side_effects else 'None'}",
            f"Decision: {exp.decision}",
            f"Lesson: {exp.lesson}",
            f"Domain: {exp.domain}",
            f"Tags: {', '.join(exp.tags) if exp.tags else 'None'}",
            f"Confidence: {exp.confidence}",
        ]
        return "\n".join(parts)

    def _content_to_experiment(self, content: str, memory_id: str, timestamp: datetime) -> ExperimentResponse:
        lines = content.strip().split("\n")
        data = {}
        for line in lines:
            if ": " in line:
                key, value = line.split(": ", 1)
                data[key.lower().replace(" ", "_")] = value

        conditions = {}
        try:
            conditions = json.loads(data.get("conditions", "{}"))
        except json.JSONDecodeError:
            pass

        side_effects = []
        if data.get("side_effects") and data.get("side_effects") != "None":
            side_effects = [s.strip() for s in data.get("side_effects", "").split(",")]

        tags = []
        if data.get("tags") and data.get("tags") != "None":
            tags = [t.strip() for t in data.get("tags", "").split(",")]

        return ExperimentResponse(
            id=memory_id,
            title=data.get("experiment", ""),
            situation=data.get("situation", ""),
            hypothesis=data.get("hypothesis", ""),
            action=data.get("action", ""),
            conditions=conditions,
            observation=data.get("observation", ""),
            outcome=OutcomeType(data.get("outcome", "unknown")),
            side_effects=side_effects,
            decision=data.get("decision", ""),
            lesson=data.get("lesson", ""),
            domain=data.get("domain", "general"),
            tags=tags,
            confidence=float(data.get("confidence", 0.5)),
            timestamp=timestamp,
            memory_id=memory_id,
        )

    async def store_experiment(self, experiment: ExperimentBase) -> ExperimentResponse:
        content = self._experiment_to_content(experiment)
        metadata = {
            "experiment_id": str(uuid.uuid4()),
            "domain": experiment.domain,
            "tags": experiment.tags,
            "outcome": experiment.outcome.value,
            "timestamp": datetime.utcnow().isoformat(),
            "type": "experiment"
        }

        result = await self.client.retain(content, metadata)
        memory_id = result.get("memory_ids", [None])[0] if result.get("memory_ids") else None

        return ExperimentResponse(
            id=memory_id or metadata["experiment_id"],
            title=experiment.title,
            situation=experiment.situation,
            hypothesis=experiment.hypothesis,
            action=experiment.action,
            conditions=experiment.conditions,
            observation=experiment.observation,
            outcome=experiment.outcome,
            side_effects=experiment.side_effects,
            decision=experiment.decision,
            lesson=experiment.lesson,
            domain=experiment.domain,
            tags=experiment.tags,
            confidence=experiment.confidence,
            timestamp=datetime.utcnow(),
            memory_id=memory_id,
        )

    async def search_experiments(
        self,
        query: str,
        limit: int = 10,
        domain: Optional[str] = None
    ) -> List[ExperimentResponse]:
        filters = {}
        if domain:
            filters["domain"] = domain

        result = await self.client.recall(query, limit, filters)
        memories = result.get("results", [])

        experiments = []
        for mem in memories:
            try:
                exp = self._content_to_experiment(
                    mem.get("text", ""),
                    mem.get("id", ""),
                    datetime.fromisoformat(mem.get("created_at", datetime.utcnow().isoformat()))
                )
                exp.similarity_score = mem.get("score", 0.0)
                experiments.append(exp)
            except Exception:
                continue

        return experiments

    async def get_all_experiments(self, limit: int = 100) -> List[ExperimentResponse]:
        result = await self.client.list_memories(limit=limit, type_filter="experiment")
        memories = result.get("memories", [])

        experiments = []
        for mem in memories:
            try:
                exp = self._content_to_experiment(
                    mem.get("text", ""),
                    mem.get("id", ""),
                    datetime.fromisoformat(mem.get("created_at", datetime.utcnow().isoformat()))
                )
                experiments.append(exp)
            except Exception:
                continue

        return experiments

    async def ask_memory(self, question: str) -> Dict[str, Any]:
        return await self.client.reflect(question)


experiment_store = ExperimentStore()