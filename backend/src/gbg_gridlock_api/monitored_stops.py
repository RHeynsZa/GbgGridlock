from __future__ import annotations

# List of stop names to monitor.
# The actual stop area GIDs are resolved at startup via the Västtrafik API
# and stored in the monitored_stops database table.
MONITORED_STOP_NAMES: tuple[str, ...] = (
    "Centralstationen",
    "Redbergsplatsen",
    "Korsvägen",
    "Järntorget",
    "Marklandsgatan",
    "Hjalmar Brantingsplatsen",
)
