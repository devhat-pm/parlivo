"""OpenTelemetry instrumentation: one span per clause plus Prometheus histograms.

The span runs from the clause's last voiced frame to the first echo audio frame published
(the phase 1 stand-in for glass-to-ear, ARCHITECTURE.md section 4). Metrics are exported for
Prometheus on PARLIVO_METRICS_PORT (default 9464). PARLIVO_TIMINGS_PATH, if set, also appends
one JSON line per clause for benchmarks.
"""

import json
import os
import threading
from dataclasses import asdict, dataclass

from opentelemetry import metrics, trace
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.view import ExplicitBucketHistogramAggregation, View
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from prometheus_client import start_http_server

LATENCY_BUCKETS_MS = (25, 50, 100, 150, 200, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 5000)


@dataclass(frozen=True)
class ClauseTiming:
    room: str
    speaker_id: str
    clause_id: str
    language: str
    reason: str
    audio_ms: int
    stt_ms: float
    clause_to_echo_ms: float
    text: str


class Telemetry:
    def __init__(self) -> None:
        meter = metrics.get_meter("parlivo.agent")
        self.tracer = trace.get_tracer("parlivo.agent")
        self._clause_to_echo = meter.create_histogram(
            "parlivo_clause_to_echo",
            unit="ms",
            description="Last voiced frame of a clause to first echo frame published",
        )
        self._stt = meter.create_histogram(
            "parlivo_stt_request", unit="ms", description="STT request round trip from the agent"
        )
        self._clauses = meter.create_counter("parlivo_clauses", description="Clauses finalised")
        self._timings_path = os.environ.get("PARLIVO_TIMINGS_PATH")
        self._lock = threading.Lock()

    def record_stt(self, ms: float, kind: str) -> None:
        self._stt.record(ms, {"kind": kind})

    def record_clause(self, timing: ClauseTiming) -> None:
        attributes = {"language": timing.language, "reason": timing.reason}
        self._clause_to_echo.record(timing.clause_to_echo_ms, attributes)
        self._clauses.add(1, attributes)
        if self._timings_path:
            with self._lock, open(self._timings_path, "a", encoding="utf-8") as out:
                out.write(json.dumps(asdict(timing), ensure_ascii=False) + "\n")


_started = False


def setup_telemetry() -> Telemetry:
    """Install providers and the Prometheus endpoint once per process."""
    global _started
    if not _started:
        resource = Resource.create({"service.name": "parlivo-agent"})
        views = [
            View(
                instrument_name=name,
                aggregation=ExplicitBucketHistogramAggregation(LATENCY_BUCKETS_MS),
            )
            for name in ("parlivo_clause_to_echo", "parlivo_stt_request")
        ]
        metrics.set_meter_provider(
            MeterProvider(resource=resource, metric_readers=[PrometheusMetricReader()], views=views)
        )
        trace.set_tracer_provider(TracerProvider(resource=resource))
        start_http_server(int(os.environ.get("PARLIVO_METRICS_PORT", "9464")), addr="0.0.0.0")
        _started = True
    return Telemetry()
