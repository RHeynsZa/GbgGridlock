from datetime import datetime
from dataclasses import dataclass


@dataclass(slots=True)
class DepartureDelayEvent:
    recorded_at: datetime
    stop_gid: str
    journey_gid: str
    line_number: str
    planned_time: datetime
    estimated_time: datetime | None
    delay_seconds: int | None
    is_cancelled: bool
    realtime_missing: bool
    transport_mode: str | None


@dataclass(slots=True)
class LineMetadata:
    line_number: str
    foreground_color: str | None
    background_color: str | None
    text_color: str | None
    border_color: str | None
    transport_mode: str | None
