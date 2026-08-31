from __future__ import annotations

import os
import re
from typing import Optional


def prepare_text(text: str, supports_paralinguistics: bool) -> str:
    if supports_paralinguistics:
        return text
    # The original and multilingual Chatterbox tokenizers do not support the
    # Turbo paralinguistic vocabulary. Remove cues instead of letting them be
    # read aloud as literal words.
    return re.sub(r"\s{2,}", " ", re.sub(r"\[(?:chuckle|laugh)\]", "", text, flags=re.IGNORECASE)).strip()


def resolve_voice_reference(reference_path: Optional[str]) -> Optional[str]:
    if reference_path and reference_path not in ("", "default") and os.path.isfile(reference_path):
        return reference_path
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "assets", "audio", "voices", "english_girl", "reference.wav")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "assets", "audio", "voices", "english_girl.wav")),
    ]
    for candidate in candidates:
        if os.path.isfile(candidate):
            return candidate
    return None
