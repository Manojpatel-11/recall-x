from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class OutcomeType(str, Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL = "partial"
    UNKNOWN = "unknown"


class ExperimentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    situation: str = Field(..., min_length=1)
    hypothesis: str = Field(..., min_length=1)
    action: str = Field(..., min_length=1)
    conditions: Dict[str, Any] = Field(default_factory=dict)
    observation: str = Field(default="")
    outcome: OutcomeType = Field(default=OutcomeType.UNKNOWN)
    side_effects: List[str] = Field(default_factory=list)
    decision: str = Field(default="")
    lesson: str = Field(default="")
    domain: str = Field(default="general")
    tags: List[str] = Field(default_factory=list)
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)


class ExperimentCreate(ExperimentBase):
    pass


class ExperimentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    situation: Optional[str] = None
    hypothesis: Optional[str] = None
    action: Optional[str] = None
    conditions: Optional[Dict[str, Any]] = None
    observation: Optional[str] = None
    outcome: Optional[OutcomeType] = None
    side_effects: Optional[List[str]] = None
    decision: Optional[str] = None
    lesson: Optional[str] = None
    domain: Optional[str] = None
    tags: Optional[List[str]] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)


class ExperimentResponse(ExperimentBase):
    id: str
    timestamp: datetime
    memory_id: Optional[str] = None
    observation_id: Optional[str] = None

    class Config:
        from_attributes = True


class ExperimentListResponse(BaseModel):
    experiments: List[ExperimentResponse]
    total: int


class PreflightRequest(BaseModel):
    proposed_action: str = Field(..., min_length=1)
    current_conditions: Dict[str, Any] = Field(default_factory=dict)
    context: str = Field(default="")


class ConditionComparison(BaseModel):
    condition: str
    historical_value: Any
    current_value: Any
    similarity: str


class HistoricalEvidence(BaseModel):
    experiment_id: str
    title: str
    outcome: OutcomeType
    conditions: Dict[str, Any]
    lesson: str
    side_effects: List[str]
    similarity_score: float


class PreflightRecommendation(str, Enum):
    PROCEED_CONTROLLED = "proceed_with_controlled_test"
    PROCEED_CAUTION = "proceed_with_caution"
    GATHER_EVIDENCE = "gather_more_evidence"
    AVOID = "avoid_repeating_under_current_conditions"


class PreflightResponse(BaseModel):
    recommendation: PreflightRecommendation
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str
    historical_evidence: List[HistoricalEvidence] = Field(default_factory=list)
    condition_comparison: List[ConditionComparison] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    suggested_test: str = ""
    known_from_memory: List[str] = Field(default_factory=list)
    inference: List[str] = Field(default_factory=list)
    unknown: List[str] = Field(default_factory=list)


class RecallRequest(BaseModel):
    query: str = Field(..., min_length=1)
    limit: int = Field(default=10, ge=1, le=50)


class RecallResponse(BaseModel):
    memories: List[Dict[str, Any]]
    total: int