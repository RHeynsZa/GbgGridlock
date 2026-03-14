from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MonitoredStopConfig:
    stop_gid: str
    stop_name: str


MONITORED_STOPS: tuple[MonitoredStopConfig, ...] = (
    MonitoredStopConfig(stop_gid="9021014001760000", stop_name="Centralstationen"),
    MonitoredStopConfig(stop_gid="9021014005650000", stop_name="Redbergsplatsen"),
    MonitoredStopConfig(stop_gid="9021014002510000", stop_name="Korsvägen"),
    MonitoredStopConfig(stop_gid="9021014003610000", stop_name="Järntorget"),
    MonitoredStopConfig(stop_gid="9021014004490000", stop_name="Marklandsgatan"),
    MonitoredStopConfig(stop_gid="9021014003100000", stop_name="Hjalmar Brantingsplatsen"),
)

MONITORED_STOP_AREA_GIDS: tuple[str, ...] = tuple(stop.stop_gid for stop in MONITORED_STOPS)
