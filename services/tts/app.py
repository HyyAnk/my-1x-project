from __future__ import annotations

import io
import logging
import os
import threading
from typing import Optional

import torch
import torchaudio
from chatterbox.tts import ChatterboxTTS
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, Response

from audio_merger import merge_audio
from models import MergeRequest, SynthesizeRequest
from patches import apply_chatterbox_patches
from voice_manager import prepare_text, resolve_voice_reference


class StructuredFormatter(logging.Formatter):
    colors = {
        "INFO": "\033[36m",
        "WARNING": "\033[33m",
        "ERROR": "\033[1;31m",
    }

    def format(self, record: logging.LogRecord) -> str:
        timestamp = self.formatTime(record, "%H:%M:%S")
        color = self.colors.get(record.levelname, "")
        reset = "\033[0m" if color else ""
        return f"\033[2m{timestamp}\033[0m {color}[{record.levelname}]{reset} [T:{threading.get_ident()}] [STEP:{getattr(record, 'step', 'runtime')}] {record.getMessage()}"


logger = logging.getLogger("documentary-tts")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredFormatter())
    logger.addHandler(handler)
logger.setLevel(logging.INFO)
logger.propagate = False

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MODEL: Optional[object] = None
MODEL_ERROR: Optional[str] = None
MODEL_KIND = "turbo" if os.getenv("CHATTERBOX_MODEL", "turbo").strip().lower() == "turbo" else "original"
MODEL_SUPPORTS_PARALINGUISTICS = MODEL_KIND == "turbo"

# Apply safety and dtype normalization patches before model instantiation
apply_chatterbox_patches(logger)

logger.info(
    "Starting Chatterbox sidecar device=%s model=%s paralinguistic_tags=%s mode=local",
    DEVICE,
    MODEL_KIND,
    MODEL_SUPPORTS_PARALINGUISTICS,
    extra={"step": "startup"},
)
try:
    if MODEL_KIND == "turbo":
        from chatterbox.tts_turbo import ChatterboxTurboTTS

        MODEL = ChatterboxTurboTTS.from_pretrained(device=DEVICE)
    else:
        MODEL = ChatterboxTTS.from_pretrained(device=DEVICE)
    logger.info("Chatterbox model loaded", extra={"step": "load_model"})
except Exception as error:  # pragma: no cover - depends on local model and hardware
    MODEL_ERROR = str(error)
    logger.error("Chatterbox model unavailable: %s", MODEL_ERROR, extra={"step": "load_model"})

app = FastAPI(title="Documentary Studio TTS", docs_url=None, redoc_url=None)
SYNTHESIS_LOCK = threading.Lock()


@app.get("/health")
async def health() -> JSONResponse:
    ready = MODEL is not None
    return JSONResponse(
        status_code=200 if ready else 503,
        content={
            "status": "ok" if ready else "loading",
            "model_loaded": ready,
            "device": DEVICE,
            "model": MODEL_KIND,
            "paralinguistic_tags": MODEL_SUPPORTS_PARALINGUISTICS,
            "error": MODEL_ERROR,
        },
    )


def synthesize(request: SynthesizeRequest) -> bytes:
    if MODEL is None:
        raise RuntimeError("Chatterbox model is not loaded")
    reference = resolve_voice_reference(request.voice_reference_path)
    with SYNTHESIS_LOCK:
        try:
            with torch.inference_mode():
                waveform = MODEL.generate(
                    prepare_text(request.text, MODEL_SUPPORTS_PARALINGUISTICS),
                    audio_prompt_path=reference,
                    exaggeration=request.exaggeration,
                    cfg_weight=request.cfg_weight,
                )
            output = io.BytesIO()
            torchaudio.save(output, waveform.detach().cpu(), MODEL.sr, format="wav")
            return output.getvalue()
        finally:
            if DEVICE == "cuda":
                torch.cuda.empty_cache()


@app.post("/synthesize")
async def synthesize_audio(request: SynthesizeRequest) -> Response:
    if MODEL is None:
        raise HTTPException(status_code=503, detail="Audio service unavailable")
    try:
        audio = await __import__("asyncio").to_thread(synthesize, request)
    except Exception as error:
        import traceback

        logger.error("Synthesis failed: %s\n%s", error, traceback.format_exc(), extra={"step": "synthesize"})
        raise HTTPException(status_code=503, detail=f"Audio service unavailable: {error}") from error
    logger.info("Generated WAV bytes=%s", len(audio), extra={"step": "synthesize"})
    return Response(content=audio, media_type="audio/wav", headers={"cache-control": "no-store"})


@app.post("/merge")
async def merge_audio_files(request: MergeRequest) -> Response:
    if MODEL is None:
        raise HTTPException(status_code=503, detail="Audio service unavailable")
    try:
        audio = await __import__("asyncio").to_thread(merge_audio, request.paths, request.gap_ms, request.target_duration_seconds)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        logger.error("Merge failed: %s", error, extra={"step": "merge"})
        raise HTTPException(status_code=503, detail="Audio merge failed") from error
    logger.info(
        "Merged WAV files=%s bytes=%s gap_ms=%s target_seconds=%s",
        len(request.paths),
        len(audio),
        request.gap_ms,
        request.target_duration_seconds,
        extra={"step": "merge"},
    )
    return Response(content=audio, media_type="audio/wav", headers={"cache-control": "no-store"})
