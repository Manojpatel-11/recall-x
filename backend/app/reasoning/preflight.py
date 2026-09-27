import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from app.models.experiment import (
    ExperimentResponse,
    PreflightRequest,
    PreflightResponse,
    PreflightRecommendation,
    HistoricalEvidence,
    ConditionComparison,
    OutcomeType
)
from app.memory.experiment_store import experiment_store
from app.config.settings import settings


class PreflightEngine:
    def __init__(self):
        self.store = experiment_store

    def _extract_conditions(self, conditions: Dict[str, Any]) -> Dict[str, Any]:
        normalized = {}
        for key, value in conditions.items():
            normalized[key.lower().replace(" ", "_")] = value
        return normalized

    def _compare_conditions(
        self,
        historical: Dict[str, Any],
        current: Dict[str, Any]
    ) -> List[ConditionComparison]:
        comparisons = []
        all_keys = set(historical.keys()) | set(current.keys())

        for key in all_keys:
            hist_val = historical.get(key)
            curr_val = current.get(key)

            if hist_val is None:
                similarity = "missing_in_historical"
            elif curr_val is None:
                similarity = "missing_in_current"
            elif hist_val == curr_val:
                similarity = "identical"
            elif isinstance(hist_val, (int, float)) and isinstance(curr_val, (int, float)):
                if hist_val == 0:
                    similarity = "different" if curr_val != 0 else "identical"
                else:
                    diff_pct = abs(hist_val - curr_val) / abs(hist_val) * 100
                    if diff_pct < 10:
                        similarity = "very_similar"
                    elif diff_pct < 30:
                        similarity = "similar"
                    elif diff_pct < 50:
                        similarity = "moderately_different"
                    else:
                        similarity = "significantly_different"
            else:
                similarity = "different" if str(hist_val).lower() != str(curr_val).lower() else "identical"

            comparisons.append(ConditionComparison(
                condition=key,
                historical_value=hist_val,
                current_value=curr_val,
                similarity=similarity
            ))

        return comparisons

    def _assess_similarity(self, comparisons: List[ConditionComparison]) -> float:
        if not comparisons:
            return 0.0

        weights = {
            "identical": 1.0,
            "very_similar": 0.9,
            "similar": 0.7,
            "moderately_different": 0.4,
            "significantly_different": 0.2,
            "different": 0.1,
            "missing_in_historical": 0.0,
            "missing_in_current": 0.5,
        }

        total_weight = sum(weights.get(c.similarity, 0.0) for c in comparisons)
        return total_weight / len(comparisons)

    def _identify_key_differences(self, comparisons: List[ConditionComparison]) -> List[str]:
        differences = []
        for c in comparisons:
            if c.similarity in ("significantly_different", "different", "missing_in_historical"):
                differences.append(
                    f"{c.condition}: historical={c.historical_value}, current={c.current_value}"
                )
        return differences

    def _identify_key_similarities(self, comparisons: List[ConditionComparison]) -> List[str]:
        similarities = []
        for c in comparisons:
            if c.similarity in ("identical", "very_similar", "similar"):
                similarities.append(
                    f"{c.condition}: both={c.current_value}"
                )
        return similarities

    def _generate_reasoning(
        self,
        request: PreflightRequest,
        evidence: List[HistoricalEvidence],
        comparisons: List[ConditionComparison],
        key_differences: List[str],
        key_similarities: List[str]
    ) -> Tuple[str, List[str], List[str], List[str]]:
        known_from_memory = []
        inference = []
        unknown = []

        if not evidence:
            unknown.append("No relevant historical experiments found in memory.")
            reasoning = (
                "No historical evidence was found for this proposed experiment. "
                "Proceed with caution and consider running a controlled test with monitoring."
            )
            return reasoning, known_from_memory, inference, unknown

        for ev in evidence:
            known_from_memory.append(
                f"Experiment '{ev.title}' ({ev.outcome.value}): {ev.lesson}"
            )

        overall_similarity = self._assess_similarity(comparisons)

        if overall_similarity > 0.7:
            inference.append(
                f"Current conditions are highly similar to historical conditions "
                f"(similarity: {overall_similarity:.0%}). Historical outcomes are likely relevant."
            )
        elif overall_similarity > 0.4:
            inference.append(
                f"Current conditions are moderately similar to historical conditions "
                f"(similarity: {overall_similarity:.0%}). Historical outcomes provide useful evidence but may not directly predict current outcome."
            )
        else:
            inference.append(
                f"Current conditions differ significantly from historical conditions "
                f"(similarity: {overall_similarity:.0%}). Historical outcomes may not directly apply."
            )

        if key_differences:
            inference.append(
                "Key differences: " + "; ".join(key_differences[:3])
            )

        if key_similarities:
            known_from_memory.append(
                "Key similarities: " + "; ".join(key_similarities[:3])
            )

        failed_experiments = [e for e in evidence if e.outcome == OutcomeType.FAILURE]
        successful_experiments = [e for e in evidence if e.outcome == OutcomeType.SUCCESS]

        if failed_experiments and overall_similarity > 0.5:
            inference.append(
                f"Found {len(failed_experiments)} similar failed experiment(s). "
                f"Review side effects: {', '.join(set().union(*[e.side_effects for e in failed_experiments]))}"
            )

        if successful_experiments and overall_similarity > 0.3:
            inference.append(
                f"Found {len(successful_experiments)} similar successful experiment(s) under different conditions."
            )

        unknown.append("Exact outcome under current conditions cannot be predicted from historical data alone.")

        reasoning = (
            f"Analyzed {len(evidence)} relevant historical experiment(s). "
            f"Overall condition similarity: {overall_similarity:.0%}. "
            + " ".join(inference[:2])
        )

        return reasoning, known_from_memory, inference, unknown

    def _determine_recommendation(
        self,
        evidence: List[HistoricalEvidence],
        comparisons: List[ConditionComparison],
        overall_similarity: float
    ) -> Tuple[PreflightRecommendation, float, List[str], str]:
        if not evidence:
            return (
                PreflightRecommendation.GATHER_EVIDENCE,
                0.3,
                ["No historical data available for this experiment type."],
                "Run a small-scale controlled test with full monitoring to establish baseline."
            )

        failed = [e for e in evidence if e.outcome == OutcomeType.FAILURE]
        successful = [e for e in evidence if e.outcome == OutcomeType.SUCCESS]
        partial = [e for e in evidence if e.outcome == OutcomeType.PARTIAL]

        all_side_effects = set()
        for e in evidence:
            all_side_effects.update(e.side_effects)

        risks = list(all_side_effects)

        if overall_similarity > 0.7 and failed and not successful:
            return (
                PreflightRecommendation.AVOID,
                0.8,
                risks,
                "Do not repeat under current conditions. Historical failure occurred under very similar conditions."
            )

        if overall_similarity > 0.7 and successful and not failed:
            return (
                PreflightRecommendation.PROCEED_CONTROLLED,
                0.75,
                risks,
                "Historical success under similar conditions. Run controlled test to confirm."
            )

        if overall_similarity > 0.5 and failed and successful:
            return (
                PreflightRecommendation.PROCEED_CAUTION,
                0.6,
                risks,
                "Mixed historical results. Conditions differ enough that outcome is uncertain. "
                "Run controlled test with gradual rollout and monitoring."
            )

        if overall_similarity > 0.4:
            return (
                PreflightRecommendation.PROCEED_CAUTION,
                0.5,
                risks,
                "Conditions moderately similar but not identical. Historical evidence is suggestive but not definitive. "
                "Run controlled test with monitoring."
            )

        return (
            PreflightRecommendation.GATHER_EVIDENCE,
            0.4,
            risks,
            "Conditions differ significantly from historical experiments. "
            "Insufficient evidence to make a strong recommendation. Run a controlled test to gather new data."
        )

    async def run_preflight(self, request: PreflightRequest) -> PreflightResponse:
        search_query = f"{request.proposed_action} {request.context}".strip()
        historical_experiments = await self.store.search_experiments(search_query, limit=10)

        evidence = []
        for exp in historical_experiments:
            hist_conditions = self._extract_conditions(exp.conditions)
            curr_conditions = self._extract_conditions(request.current_conditions)

            comparisons = self._compare_conditions(hist_conditions, curr_conditions)
            similarity = self._assess_similarity(comparisons)

            evidence.append(HistoricalEvidence(
                experiment_id=exp.id,
                title=exp.title,
                outcome=exp.outcome,
                conditions=exp.conditions,
                lesson=exp.lesson,
                side_effects=exp.side_effects,
                similarity_score=similarity
            ))

        evidence.sort(key=lambda e: e.similarity_score, reverse=True)
        top_evidence = evidence[:5]

        all_comparisons = []
        for ev in top_evidence:
            hist_conditions = self._extract_conditions(ev.conditions)
            curr_conditions = self._extract_conditions(request.current_conditions)
            comparisons = self._compare_conditions(hist_conditions, curr_conditions)
            all_comparisons.extend(comparisons)

        overall_similarity = self._assess_similarity(all_comparisons)
        key_differences = self._identify_key_differences(all_comparisons)
        key_similarities = self._identify_key_similarities(all_comparisons)

        reasoning, known_from_memory, inference, unknown = self._generate_reasoning(
            request, top_evidence, all_comparisons, key_differences, key_similarities
        )

        recommendation, confidence, risks, suggested_test = self._determine_recommendation(
            top_evidence, all_comparisons, overall_similarity
        )

        return PreflightResponse(
            recommendation=recommendation,
            confidence=confidence,
            reasoning=reasoning,
            historical_evidence=top_evidence,
            condition_comparison=all_comparisons,
            risks=risks,
            suggested_test=suggested_test,
            known_from_memory=known_from_memory,
            inference=inference,
            unknown=unknown
        )


preflight_engine = PreflightEngine()