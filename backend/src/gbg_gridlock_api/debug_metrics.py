from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from threading import Lock


ROLLING_WINDOW_MINUTES = 5


@dataclass(slots=True)
class PollRequestMetric:
    recorded_at: datetime
    duration_ms: float
    success: bool


@dataclass(slots=True)
class PollCycleMetric:
    recorded_at: datetime
    successful_stops: int
    failed_stops: int


_request_metrics: deque[PollRequestMetric] = deque()
_cycle_metrics: deque[PollCycleMetric] = deque()
_metrics_lock = Lock()


def _cutoff(now: datetime) -> datetime:
    return now - timedelta(minutes=ROLLING_WINDOW_MINUTES)


def _prune(now: datetime) -> None:
    threshold = _cutoff(now)
    while _request_metrics and _request_metrics[0].recorded_at < threshold:
        _request_metrics.popleft()
    while _cycle_metrics and _cycle_metrics[0].recorded_at < threshold:
        _cycle_metrics.popleft()


def record_poll_request(*, duration_ms: float, success: bool, recorded_at: datetime | None = None) -> None:
    now = recorded_at or datetime.now(timezone.utc)
    with _metrics_lock:
        _request_metrics.append(PollRequestMetric(recorded_at=now, duration_ms=duration_ms, success=success))
        _prune(now)


def record_poll_cycle(*, successful_stops: int, failed_stops: int, recorded_at: datetime | None = None) -> None:
    now = recorded_at or datetime.now(timezone.utc)
    with _metrics_lock:
        _cycle_metrics.append(PollCycleMetric(recorded_at=now, successful_stops=successful_stops, failed_stops=failed_stops))
        _prune(now)


def get_snapshot(*, monitored_stops_count: int) -> dict[str, float | int]:
    now = datetime.now(timezone.utc)
    with _metrics_lock:
        _prune(now)
        request_count = len(_request_metrics)
        success_count = sum(1 for item in _request_metrics if item.success)
        avg_response_time_ms = (
            sum(item.duration_ms for item in _request_metrics) / request_count if request_count > 0 else 0.0
        )
        success_rate_percent = (success_count / request_count * 100.0) if request_count > 0 else 0.0

        cycle_count = len(_cycle_metrics)
        successful_stops_total = sum(item.successful_stops for item in _cycle_metrics)
        failed_stops_total = sum(item.failed_stops for item in _cycle_metrics)

    return {
        "window_minutes": ROLLING_WINDOW_MINUTES,
        "monitored_stops_count": monitored_stops_count,
        "poll_requests_count_5m": request_count,
        "successful_poll_requests_count_5m": success_count,
        "average_api_response_time_ms_5m": avg_response_time_ms,
        "success_rate_percent_5m": success_rate_percent,
        "poll_cycles_count_5m": cycle_count,
        "successful_stop_polls_count_5m": successful_stops_total,
        "failed_stop_polls_count_5m": failed_stops_total,
    }

