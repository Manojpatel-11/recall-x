import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.models.experiment import (
    ExperimentCreate,
    ExperimentResponse,
    PreflightRequest,
    PreflightResponse,
    PreflightRecommendation,
    HistoricalEvidence,
    ConditionComparison,
    OutcomeType
)
from app.reasoning.preflight import PreflightEngine
from app.memory.experiment_store import ExperimentStore


class MockExperimentStore:
    def __init__(self):
        self.experiments = []

    async def search_experiments(self, query: str, limit: int = 10, domain: str = None):
        return self.experiments

    def add_experiment(self, exp: ExperimentResponse):
        self.experiments.append(exp)


@pytest.fixture
def mock_store():
    store = MockExperimentStore()
    return store


@pytest.fixture
def preflight_engine(mock_store):
    engine = PreflightEngine()
    engine.store = mock_store
    return engine


@pytest.fixture
def sample_experiment():
    return ExperimentResponse(
        id="exp-1",
        title="Increase API timeout from 10s to 15s",
        situation="High traffic API service",
        hypothesis="Increasing timeout will reduce failed requests",
        action="Changed timeout from 10s to 15s",
        conditions={"traffic_rpm": 2000, "connection_pool": 50},
        observation="Connection pool exhausted",
        outcome=OutcomeType.FAILURE,
        side_effects=["Connection pool exhaustion", "Cascading failures"],
        decision="Reverted to 10s",
        lesson="15s timeout unsafe under high traffic with small pool",
        domain="api-configuration",
        tags=["timeout", "failure"],
        confidence=0.95,
        timestamp="2024-01-15T10:00:00"
    )


class TestPreflightEngine:
    @pytest.mark.asyncio
    async def test_no_historical_evidence(self, preflight_engine):
        request = PreflightRequest(
            proposed_action="Increase timeout to 30s",
            current_conditions={"traffic_rpm": 100, "connection_pool": 200},
            context="New experiment"
        )
        result = await preflight_engine.run_preflight(request)

        assert result.recommendation == PreflightRecommendation.GATHER_EVIDENCE
        assert result.confidence == 0.3
        assert len(result.unknown) > 0
        assert "No relevant historical experiments" in result.unknown[0]

    @pytest.mark.asyncio
    async def test_high_similarity_failure(self, preflight_engine, sample_experiment):
        preflight_engine.store.add_experiment(sample_experiment)

        request = PreflightRequest(
            proposed_action="Increase API timeout from 10s to 15s",
            current_conditions={"traffic_rpm": 2000, "connection_pool": 50},
            context="Same conditions"
        )
        result = await preflight_engine.run_preflight(request)

        assert result.recommendation == PreflightRecommendation.AVOID
        assert result.confidence >= 0.7
        assert len(result.historical_evidence) == 1
        assert "Connection pool exhaustion" in result.risks

    @pytest.mark.asyncio
    async def test_different_conditions_same_action(self, preflight_engine, sample_experiment):
        preflight_engine.store.add_experiment(sample_experiment)

        request = PreflightRequest(
            proposed_action="Increase API timeout from 10s to 15s",
            current_conditions={"traffic_rpm": 700, "connection_pool": 150},
            context="Low traffic, large pool"
        )
        result = await preflight_engine.run_preflight(request)

        assert result.recommendation in (
            PreflightRecommendation.PROCEED_CAUTION,
            PreflightRecommendation.GATHER_EVIDENCE
        )
        assert len(result.condition_comparison) > 0
        diffs = [c for c in result.condition_comparison if c.similarity in ("significantly_different", "different")]
        assert len(diffs) > 0

    @pytest.mark.asyncio
    async def test_condition_comparison_logic(self, preflight_engine):
        engine = preflight_engine
        hist = {"traffic_rpm": 2000, "connection_pool": 50, "timeout": 15}
        curr = {"traffic_rpm": 700, "connection_pool": 150, "timeout": 15}

        comparisons = engine._compare_conditions(hist, curr)

        assert len(comparisons) == 3
        timeout_comp = next(c for c in comparisons if c.condition == "timeout")
        assert timeout_comp.similarity == "identical"

        traffic_comp = next(c for c in comparisons if c.condition == "traffic_rpm")
        assert traffic_comp.similarity == "significantly_different"

        pool_comp = next(c for c in comparisons if c.condition == "connection_pool")
        assert pool_comp.similarity == "significantly_different"

    @pytest.mark.asyncio
    async def test_similarity_scoring(self, preflight_engine):
        engine = preflight_engine
        comparisons = [
            ConditionComparison(condition="a", historical_value=100, current_value=100, similarity="identical"),
            ConditionComparison(condition="b", historical_value=100, current_value=95, similarity="very_similar"),
            ConditionComparison(condition="c", historical_value=100, current_value=50, similarity="significantly_different"),
        ]
        score = engine._assess_similarity(comparisons)
        assert 0.6 < score < 0.8

    @pytest.mark.asyncio
    async def test_mixed_evidence(self, preflight_engine):
        exp1 = ExperimentResponse(
            id="exp-1",
            title="Timeout 15s - High Traffic",
            situation="", hypothesis="", action="",
            conditions={"traffic_rpm": 2000, "connection_pool": 50},
            observation="", outcome=OutcomeType.FAILURE,
            side_effects=["Pool exhaustion"], decision="", lesson="Failed",
            domain="", tags=[], confidence=0.9, timestamp="2024-01-01"
        )
        exp2 = ExperimentResponse(
            id="exp-2",
            title="Timeout 15s - Low Traffic",
            situation="", hypothesis="", action="",
            conditions={"traffic_rpm": 700, "connection_pool": 150},
            observation="", outcome=OutcomeType.SUCCESS,
            side_effects=[], decision="", lesson="Worked",
            domain="", tags=[], confidence=0.9, timestamp="2024-01-02"
        )
        preflight_engine.store.add_experiment(exp1)
        preflight_engine.store.add_experiment(exp2)

        request = PreflightRequest(
            proposed_action="Increase timeout to 15s",
            current_conditions={"traffic_rpm": 1000, "connection_pool": 100},
            context="Medium conditions"
        )
        result = await preflight_engine.run_preflight(request)

        assert len(result.historical_evidence) == 2
        assert any("mixed" in i.lower() or "Mixed" in i for i in result.inference)


class TestExperimentModels:
    def test_experiment_create_validation(self):
        exp = ExperimentCreate(
            title="Test Experiment",
            situation="Test situation",
            hypothesis="Test hypothesis",
            action="Test action",
            conditions={"key": "value"},
            outcome=OutcomeType.SUCCESS
        )
        assert exp.title == "Test Experiment"
        assert exp.outcome == OutcomeType.SUCCESS
        assert exp.confidence == 0.5

    def test_experiment_create_invalid_confidence(self):
        with pytest.raises(ValueError):
            ExperimentCreate(
                title="Test",
                situation="Test",
                hypothesis="Test",
                action="Test",
                confidence=1.5
            )

    def test_preflight_request_validation(self):
        req = PreflightRequest(
            proposed_action="Test action",
            current_conditions={"traffic": 100}
        )
        assert req.proposed_action == "Test action"
        assert req.current_conditions["traffic"] == 100


if __name__ == "__main__":
    pytest.main([__file__, "-v"])