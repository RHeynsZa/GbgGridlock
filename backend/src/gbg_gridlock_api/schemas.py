from pydantic import BaseModel


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
