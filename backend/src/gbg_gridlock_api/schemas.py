from pydantic import BaseModel


class WorstLine(BaseModel):
    line_number: str
    avg_delay_seconds: float
    sample_size: int


class DelayDistributionBucket(BaseModel):
    bucket_seconds: int
    departures: int


class BottleneckStop(BaseModel):
    stop_gid: str
    severe_or_cancelled_count: int
    total_departures: int
