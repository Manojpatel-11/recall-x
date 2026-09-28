import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from backend.app.memory.experiment_store import experiment_store
from backend.app.models.experiment import ExperimentCreate, OutcomeType


DEMO_EXPERIMENTS = [
    ExperimentCreate(
        title="Increase API timeout from 10s to 15s",
        situation="High traffic API service experiencing request failures during peak load",
        hypothesis="Increasing timeout will reduce failed requests by allowing more time for slow responses",
        action="Changed API gateway timeout from 10 seconds to 15 seconds",
        conditions={
            "traffic_rpm": 2000,
            "connection_pool": 50,
            "api_provider": "internal",
            "deployment": "k8s-prod",
            "avg_latency_ms": 8000
        },
        observation="Requests stayed alive longer but connection pool exhausted rapidly. New connections queued and eventually timed out.",
        outcome=OutcomeType.FAILURE,
        side_effects=[
            "Connection pool exhaustion",
            "Increased queue depth",
            "Cascading timeout failures",
            "Downstream service degradation"
        ],
        decision="Reverted to 10s timeout immediately",
        lesson="15s timeout is unsafe under high traffic (2000+ rpm) with small connection pool (50). Long timeouts hold connections open, starving the pool.",
        domain="api-configuration",
        tags=["timeout", "connection-pool", "high-traffic", "failure"],
        confidence=0.95
    ),
    ExperimentCreate(
        title="Increase API timeout from 10s to 15s (low traffic)",
        situation="Low traffic internal API service with occasional slow responses",
        hypothesis="15s timeout will handle slow responses without pool exhaustion at low traffic",
        action="Changed API gateway timeout from 10 seconds to 15 seconds",
        conditions={
            "traffic_rpm": 700,
            "connection_pool": 150,
            "api_provider": "internal",
            "deployment": "k8s-staging",
            "avg_latency_ms": 12000
        },
        observation="Slow requests completed successfully. Connection pool utilization remained healthy at ~40%. No queuing observed.",
        outcome=OutcomeType.SUCCESS,
        side_effects=[
            "Slightly increased average latency",
            "Better handling of slow downstream responses"
        ],
        decision="Kept 15s timeout in staging",
        lesson="15s timeout works well under low traffic (700 rpm) with large connection pool (150). Pool capacity absorbs longer-held connections.",
        domain="api-configuration",
        tags=["timeout", "connection-pool", "low-traffic", "success"],
        confidence=0.9
    ),
    ExperimentCreate(
        title="Increase API timeout to 20s",
        situation="External payment API with highly variable latency during peak hours",
        hypothesis="20s timeout will accommodate payment provider's worst-case latency",
        action="Set API gateway timeout to 20 seconds for payment endpoints",
        conditions={
            "traffic_rpm": 1200,
            "connection_pool": 100,
            "api_provider": "stripe",
            "deployment": "k8s-prod",
            "avg_latency_ms": 15000
        },
        observation="Payment success rate improved from 94% to 98%. However, memory usage increased 40% and 3 instances OOM'd during traffic spike.",
        outcome=OutcomeType.PARTIAL,
        side_effects=[
            "Increased memory usage (40%)",
            "OOM kills during traffic spikes",
            "Longer request queues"
        ],
        decision="Reduced to 15s with circuit breaker",
        lesson="20s timeout improves success rate but risks resource exhaustion. Use circuit breakers and monitoring with long timeouts.",
        domain="api-configuration",
        tags=["timeout", "external-api", "payment", "partial-success", "resource-exhaustion"],
        confidence=0.85
    ),
    ExperimentCreate(
        title="Reduce database connection pool from 100 to 50",
        situation="Database CPU utilization high during peak, suspecting too many connections",
        hypothesis="Smaller pool will reduce connection overhead and CPU contention",
        action="Reduced PostgreSQL connection pool from 100 to 50 via PgBouncer",
        conditions={
            "traffic_rpm": 3000,
            "db_instance": "db.r6g.xlarge",
            "max_connections": 1000,
            "avg_query_ms": 45
        },
        observation="CPU dropped 15% but connection queue built up. 99th percentile latency increased from 120ms to 800ms.",
        outcome=OutcomeType.PARTIAL,
        side_effects=[
            "Increased p99 latency",
            "Connection queue buildup",
            "Client-side timeout errors"
        ],
        decision="Increased back to 75 with query optimization",
        lesson="Pool reduction helps CPU but hurts latency under high traffic. Optimize queries first, then tune pool size.",
        domain="database-optimization",
        tags=["connection-pool", "database", "latency", "cpu", "partial"],
        confidence=0.8
    ),
    ExperimentCreate(
        title="Enable Redis caching for user sessions",
        situation="Auth service latency high due to repeated DB lookups for session validation",
        hypothesis="Redis cache will reduce auth latency by 80%+",
        action="Added Redis cache layer with 5min TTL for session tokens",
        conditions={
            "traffic_rpm": 5000,
            "auth_service": "custom-jwt",
            "db": "postgresql",
            "cache": "redis-cluster"
        },
        observation="Auth latency dropped from 120ms to 15ms (p50). Cache hit rate 92%. Zero auth-related incidents since deployment.",
        outcome=OutcomeType.SUCCESS,
        side_effects=[
            "Added infrastructure complexity",
            "Cache invalidation edge cases",
            "Minor memory overhead"
        ],
        decision="Deployed to production",
        lesson="Redis caching for session validation is highly effective at scale. Ensure cache invalidation strategy for logout/token refresh.",
        domain="caching",
        tags=["redis", "caching", "auth", "latency", "success"],
        confidence=0.95
    ),
    ExperimentCreate(
        title="Switch from sync to async database driver",
        situation="API threads blocking on database I/O, limiting throughput",
        hypothesis="Async driver will increase throughput by 3-4x under same thread count",
        action="Migrated from psycopg2 to asyncpg with asyncio",
        conditions={
            "traffic_rpm": 10000,
            "framework": "fastapi",
            "db": "postgresql",
            "workers": 8
        },
        observation="Throughput increased 3.2x. However, connection leaks caused pool exhaustion after 6 hours. Required connection lifecycle fixes.",
        outcome=OutcomeType.PARTIAL,
        side_effects=[
            "Connection leaks initially",
            "Required code refactoring",
            "Debugging complexity increased"
        ],
        decision="Fixed leaks and deployed",
        lesson="Async drivers provide significant throughput gains but require careful connection management. Use connection pools with strict lifecycles.",
        domain="database-optimization",
        tags=["async", "database", "throughput", "connection-leaks", "partial"],
        confidence=0.8
    ),
    ExperimentCreate(
        title="Increase Kafka consumer poll interval",
        situation="Consumer lag growing during traffic spikes, processing can't keep up",
        hypothesis="Larger poll interval will batch more records and improve throughput",
        action="Increased poll.interval.ms from 100ms to 500ms",
        conditions={
            "traffic_rpm": 50000,
            "topic_partitions": 24,
            "consumer_group": "payment-processor",
            "max_poll_records": 500
        },
        observation="Throughput improved 20% but end-to-end latency increased from 2s to 8s. SLA breach for payment processing.",
        outcome=OutcomeType.FAILURE,
        side_effects=[
            "Increased processing latency",
            "SLA violations",
            "Downstream timeout cascades"
        ],
        decision="Reverted to 100ms, added more consumer instances",
        lesson="Larger poll intervals improve throughput but hurt latency. For latency-sensitive workloads, scale consumers horizontally instead.",
        domain="messaging",
        tags=["kafka", "consumer", "latency", "throughput", "failure"],
        confidence=0.9
    ),
    ExperimentCreate(
        title="Add request hedging for critical service calls",
        situation="P99 latency for recommendation service occasionally spikes to 5s+",
        hypothesis="Hedged requests will reduce tail latency by racing multiple instances",
        action="Implemented request hedging with 50ms delay for 2nd attempt",
        conditions={
            "traffic_rpm": 8000,
            "service": "recommendations",
            "instances": 6,
            "p99_latency_ms": 5000
        },
        observation="P99 latency dropped from 5s to 800ms. Request volume increased 2x but cluster handled it. Cost increased 15%.",
        outcome=OutcomeType.SUCCESS,
        side_effects=[
            "Increased compute cost (15%)",
            "Double request load during hedging",
            "Requires idempotent endpoints"
        ],
        decision="Deployed to all critical paths",
        lesson="Request hedging dramatically improves tail latency for idempotent services. Budget for 1.5-2x request volume during hedging windows.",
        domain="resilience",
        tags=["hedging", "latency", "tail-latency", "resilience", "success"],
        confidence=0.9
    )
]


async def seed_experiments():
    print(f"Seeding {len(DEMO_EXPERIMENTS)} demo experiments...")
    for i, exp in enumerate(DEMO_EXPERIMENTS, 1):
        try:
            result = await experiment_store.store_experiment(exp)
            print(f"  [{i}/{len(DEMO_EXPERIMENTS)}] Stored: {exp.title} (ID: {result.id})")
        except Exception as e:
            print(f"  [{i}/{len(DEMO_EXPERIMENTS)}] FAILED: {exp.title} - {e}")
    print("Seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed_experiments())