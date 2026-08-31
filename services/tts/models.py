from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class SynthesizeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=50_000)
    voice_reference_path: Optional[str] = None
    exaggeration: float = Field(default=0.5, ge=0.0, le=1.0)
    cfg_weight: float = Field(default=0.5, ge=0.0, le=1.0)


class MergeRequest(BaseModel):
    paths: list[str] = Field(min_length=1, max_length=128)
    gap_ms: int = Field(default=300, ge=0, le=10_000)
    target_duration_seconds: Optional[float] = Field(default=None, ge=10.0, le=7_200.0)
