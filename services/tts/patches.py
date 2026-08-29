"""
Chatterbox TTS Monkey-Patches and Device / Float32 Normalization.

This module provides compatibility patches for Chatterbox TTS:
1. Enforces float32 conversion across conditionals, voice encoder embeddings, and tokenizer log-mel tensors to avoid dtype mismatch crashes on CUDA/CPU.
2. Synchronizes conditionals across internal models.
3. Implements safety guardrails to gracefully log warnings if upstream library structure changes.
"""

from __future__ import annotations

import logging
from typing import Optional
import torch

logger = logging.getLogger("documentary-tts.patches")


def apply_chatterbox_patches(custom_logger: Optional[logging.Logger] = None) -> bool:
    """Apply safety and float32 normalization patches to Chatterbox TTS."""
    log = custom_logger or logger
    applied_count = 0

    try:
        import numpy as np

        # 1. Patch T3Cond to ensure all float tensors are converted to torch.float32
        try:
            from chatterbox.models.t3.modules.cond_enc import T3Cond

            def safe_t3cond_to(self, *, device=None, dtype=None):
                for k, v in self.__dict__.items():
                    if torch.is_tensor(v):
                        is_fp = v.dtype in (torch.float16, torch.float32, torch.float64, torch.bfloat16)
                        target_dtype = dtype if dtype is not None else (torch.float32 if is_fp else None)
                        setattr(self, k, v.to(device=device, dtype=target_dtype if is_fp else None))
                return self

            T3Cond.to = safe_t3cond_to
            applied_count += 1
        except Exception as exc:
            log.warning("Could not patch T3Cond: %s", exc)

        # 2. Patch Conditionals container
        def safe_cond_to(self, device):
            if hasattr(self, "t3") and self.t3 is not None:
                self.t3 = self.t3.to(device=device)
            if hasattr(self, "gen") and isinstance(self.gen, dict):
                for k, v in self.gen.items():
                    if torch.is_tensor(v):
                        is_fp = v.dtype in (torch.float16, torch.float32, torch.float64, torch.bfloat16)
                        self.gen[k] = v.to(device=device, dtype=torch.float32 if is_fp else None)
            return self

        for module_name, class_name in [
            ("chatterbox.tts", "Conditionals"),
            ("chatterbox.tts_turbo", "Conditionals"),
        ]:
            try:
                mod = __import__(module_name, fromlist=[class_name])
                cond_class = getattr(mod, class_name, None)
                if cond_class is not None:
                    cond_class.to = safe_cond_to
                    applied_count += 1
            except Exception:
                pass

        # 3. Patch VoiceEncoder forward, inference, and embeds_from_mels to enforce float32
        try:
            from chatterbox.models.voice_encoder.voice_encoder import VoiceEncoder

            orig_ve_forward = VoiceEncoder.forward

            def safe_ve_forward(self, mels: torch.FloatTensor):
                if torch.is_tensor(mels):
                    mels = mels.to(device=self.device, dtype=torch.float32)
                return orig_ve_forward(self, mels)

            VoiceEncoder.forward = safe_ve_forward

            orig_ve_inference = VoiceEncoder.inference

            def safe_ve_inference(self, mels: torch.Tensor, mel_lens, overlap=0.5, rate: float = None, min_coverage=0.8, batch_size=None):
                if torch.is_tensor(mels):
                    mels = mels.to(dtype=torch.float32)
                return orig_ve_inference(self, mels, mel_lens, overlap=overlap, rate=rate, min_coverage=min_coverage, batch_size=batch_size)

            VoiceEncoder.inference = safe_ve_inference

            orig_ve_embeds_from_mels = VoiceEncoder.embeds_from_mels

            def safe_embeds_from_mels(self, mels, mel_lens=None, as_spk=False, batch_size=32, **kwargs):
                if isinstance(mels, list):
                    mels = [np.asarray(m, dtype=np.float32) for m in mels]
                elif torch.is_tensor(mels):
                    mels = mels.to(dtype=torch.float32)
                return orig_ve_embeds_from_mels(self, mels, mel_lens=mel_lens, as_spk=as_spk, batch_size=batch_size, **kwargs)

            VoiceEncoder.embeds_from_mels = safe_embeds_from_mels
            applied_count += 1
        except Exception as exc:
            log.warning("Could not patch VoiceEncoder: %s", exc)

        # 4. Patch S3Tokenizer _prepare_audio and log_mel_spectrogram to normalize spectrogram tensors
        try:
            from chatterbox.models.s3tokenizer.s3tokenizer import S3Tokenizer

            def safe_prepare_audio(self, wavs):
                processed_wavs = []
                for wav in wavs:
                    if isinstance(wav, np.ndarray):
                        wav = torch.from_numpy(wav.astype(np.float32)).float()
                    elif torch.is_tensor(wav):
                        wav = wav.to(dtype=torch.float32)
                    if wav.dim() == 1:
                        wav = wav.unsqueeze(0)
                    processed_wavs.append(wav.to(dtype=torch.float32))
                return processed_wavs

            S3Tokenizer._prepare_audio = safe_prepare_audio

            orig_log_mel = S3Tokenizer.log_mel_spectrogram

            def safe_log_mel_spectrogram(self, audio: torch.Tensor, padding: int = 0):
                if isinstance(audio, np.ndarray):
                    audio = torch.from_numpy(audio.astype(np.float32)).float()
                elif torch.is_tensor(audio):
                    audio = audio.to(dtype=torch.float32)
                if hasattr(self, "_mel_filters") and torch.is_tensor(self._mel_filters):
                    self._mel_filters = self._mel_filters.to(dtype=torch.float32)
                if hasattr(self, "window") and torch.is_tensor(self.window):
                    self.window = self.window.to(dtype=torch.float32)
                return orig_log_mel(self, audio, padding=padding).to(dtype=torch.float32)

            S3Tokenizer.log_mel_spectrogram = safe_log_mel_spectrogram
            applied_count += 1
        except Exception as exc:
            log.warning("Could not patch S3Tokenizer: %s", exc)

        # 5. Patch ChatterboxTTS and ChatterboxTurboTTS prepare_conditionals to synchronize conditional embeddings
        def _sanitize_conds(tts_instance):
            if hasattr(tts_instance, "conds") and tts_instance.conds is not None:
                if hasattr(tts_instance.conds, "t3") and tts_instance.conds.t3 is not None:
                    tts_instance.conds.t3 = tts_instance.conds.t3.to(device=tts_instance.device, dtype=torch.float32)
                if hasattr(tts_instance.conds, "gen") and isinstance(tts_instance.conds.gen, dict):
                    for k, v in tts_instance.conds.gen.items():
                        if torch.is_tensor(v):
                            is_fp = v.dtype in (torch.float16, torch.float32, torch.float64, torch.bfloat16)
                            tts_instance.conds.gen[k] = v.to(device=tts_instance.device, dtype=torch.float32 if is_fp else None)

        try:
            from chatterbox.tts import ChatterboxTTS

            orig_cb_prep = ChatterboxTTS.prepare_conditionals

            def safe_cb_prep(self, wav_fpath, exaggeration=0.5, **kwargs):
                orig_cb_prep(self, wav_fpath, exaggeration=exaggeration, **kwargs)
                _sanitize_conds(self)

            ChatterboxTTS.prepare_conditionals = safe_cb_prep
            applied_count += 1
        except Exception as exc:
            log.warning("Could not patch ChatterboxTTS: %s", exc)

        try:
            from chatterbox.tts_turbo import ChatterboxTurboTTS

            orig_turbo_prep = ChatterboxTurboTTS.prepare_conditionals

            def safe_turbo_prep(self, wav_fpath, exaggeration=0.5, norm_loudness=True, **kwargs):
                orig_turbo_prep(self, wav_fpath, exaggeration=exaggeration, norm_loudness=norm_loudness, **kwargs)
                _sanitize_conds(self)

            ChatterboxTurboTTS.prepare_conditionals = safe_turbo_prep
            applied_count += 1
        except Exception as exc:
            log.warning("Could not patch ChatterboxTurboTTS: %s", exc)

        log.info("Chatterbox float32/device patches applied successfully (%d hooks active)", applied_count)
        return True
    except Exception as exc:
        log.warning("Failed to apply chatterbox float32 patches: %s", exc)
        return False
