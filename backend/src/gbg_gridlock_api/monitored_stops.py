from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MonitoredStopConfig:
    stop_gid: str
    stop_name: str


MONITORED_STOPS: tuple[MonitoredStopConfig, ...] = (
    MonitoredStopConfig(stop_gid="9021014001950000", stop_name="Centralstationen"),
    MonitoredStopConfig(stop_gid="9021014005650000", stop_name="Redbergsplatsen"),  # TODO: Verify this GID
    MonitoredStopConfig(stop_gid="9021014003980000", stop_name="Korsvägen"),
    MonitoredStopConfig(stop_gid="9021014003640000", stop_name="Järntorget"),
    MonitoredStopConfig(stop_gid="9021014004760000", stop_name="Marklandsgatan"),
    MonitoredStopConfig(stop_gid="9021014003180000", stop_name="Hjalmar Brantingsplatsen"),
)

MONITORED_STOP_AREA_GIDS: tuple[str, ...] = tuple(stop.stop_gid for stop in MONITORED_STOPS)
MONITORED_STOP_NAMES_BY_GID: dict[str, str] = {stop.stop_gid: stop.stop_name for stop in MONITORED_STOPS}
