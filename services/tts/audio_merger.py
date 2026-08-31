from __future__ import annotations

import io
import math
import os
import threading
from typing import Optional

import torch
import torchaudio

MERGE_LOCK = threading.Lock()


def merge_audio(paths: list[str], gap_ms: int, target_duration_seconds: Optional[float] = None) -> bytes:
    with MERGE_LOCK:
        waveforms = []
        sample_rate: Optional[int] = None
        channels: Optional[int] = None
        for path in paths:
            if not os.path.isabs(path) or not os.path.isfile(path):
                raise ValueError("Audio file does not exist")
            waveform, current_rate = torchaudio.load(path)
            if sample_rate is None:
                sample_rate = current_rate
                channels = waveform.shape[0]
            elif current_rate != sample_rate:
                waveform = torchaudio.functional.resample(waveform, current_rate, sample_rate)
            if channels is not None and waveform.shape[0] != channels:
                if waveform.shape[0] == 1:
                    waveform = waveform.repeat(channels, 1)
                elif channels == 1:
                    waveform = waveform.mean(dim=0, keepdim=True)
                else:
                    waveform = waveform.mean(dim=0, keepdim=True).repeat(channels, 1)
            waveforms.append(waveform)
        if not waveforms or sample_rate is None:
            raise ValueError("At least one audio file is required")
        gap_frames = round(sample_rate * gap_ms / 1000)
        pieces = []
        for index, waveform in enumerate(waveforms):
            if index > 0 and gap_frames > 0:
                pieces.append(torch.zeros((waveform.shape[0], gap_frames), dtype=waveform.dtype))
            pieces.append(waveform)
        merged = torch.cat(pieces, dim=1)
        if target_duration_seconds is not None:
            target_frames = round(sample_rate * target_duration_seconds)
            current_frames = merged.shape[1]
            rate = current_frames / max(1, target_frames)
            if not 0.72 <= rate <= 1.28:
                raise ValueError(f"Requested duration change is too large ({rate:.3f}x playback rate)")
            if abs(target_frames - current_frames) > sample_rate:
                n_fft = 1024
                hop_length = 256
                window = torch.hann_window(n_fft, device=merged.device)
                spectrum = torch.stft(merged, n_fft=n_fft, hop_length=hop_length, window=window, return_complex=True)
                phase_advance = torch.linspace(0, math.pi * hop_length, spectrum.shape[-2], device=merged.device)[..., None]
                stretched = torchaudio.functional.phase_vocoder(spectrum, rate=rate, phase_advance=phase_advance)
                merged = torch.istft(stretched, n_fft=n_fft, hop_length=hop_length, window=window, length=target_frames)
                peak = merged.abs().max()
                if peak > 0.99:
                    merged = merged * (0.99 / peak)
        output = io.BytesIO()
        torchaudio.save(output, merged.cpu(), sample_rate, format="wav")
        return output.getvalue()
