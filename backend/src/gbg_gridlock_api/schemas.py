from datetime import datetime, timezone
from typing import Any
from pydantic import BaseModel, field_serializer, ConfigDict


class WorstLine(BaseModel):
    line_number: str
    avg_delay_seconds: float
    sample_size: int
    transport_mode: str | None = None


class DelayDistributionBucket(BaseModel):
    bucket_seconds: int
    departures: int


class BottleneckStop(BaseModel):
    stop_gid: str
    severe_or_cancelled_count: int
    total_departures: int


class MonitoredStop(BaseModel):
    stop_gid: str
    stop_name: str


class LineMetadata(BaseModel):
    line_number: str
    foreground_color: str | None = None
    background_color: str | None = None
    text_color: str | None = None
    border_color: str | None = None
    transport_mode: str | None = None


class DebugMetrics(BaseModel):
    window_minutes: int
    monitored_stops_count: int
    poll_requests_count_5m: int
    successful_poll_requests_count_5m: int
    average_api_response_time_ms_5m: float
    success_rate_percent_5m: float
    poll_cycles_count_5m: int
    successful_stop_polls_count_5m: int
    failed_stop_polls_count_5m: int


class NetworkStats(BaseModel):
    avg_delay_seconds: float
    reliability_percent: float
    cancellation_rate_percent: float
    p95_delay_seconds: float
    sample_size: int


class HourlyTrendPoint(BaseModel):
    hour: datetime
    tram: float
    bus: float
    ferry: float
    
    @field_serializer('hour')
    def serialize_hour(self, dt: datetime, _info: Any) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        iso_string = dt.isoformat()
        return iso_string.replace('+00:00', 'Z')


class LineDetail(BaseModel):
    line_number: str
    transport_mode: str | None
    avg_delay_seconds: float
    on_time_rate_percent: float
    canceled_trips: int
    sample_size: int
