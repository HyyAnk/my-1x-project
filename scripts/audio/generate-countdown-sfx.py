#!/usr/bin/env python3
"""
Pure Crystal Glass "Ting... Ting..." Countdown Synthesizer (5-4-3-2-1).
Style: Thánh thót, trong vắt như tiếng gõ ly pha lê / chuông bấm lễ tân (Pure Crystal Ting).
Zero distortion, pure harmonic crystal glass ringing with ascending musical pitches.
Format: Studio-grade 48kHz, 16-bit Mono WAV.
"""

import os
import wave
import numpy as np

SAMPLE_RATE = 48000

def synth_pure_ting(f0, dur=0.35, is_climax=False):
    """
    Synthesize an ultra-clean, pristine crystal glass / bell "Ting!" note.
    1. Glass clink transient (3ms high-frequency strike)
    2. Pure fundamental sine with natural exponential ring-out
    3. Crystalline inharmonic glass overtones (2.756x mode)
    """
    n = int(SAMPLE_RATE * dur)
    t = np.linspace(0, dur, n, endpoint=False)

    # 1. Glass clink transient (3ms high strike)
    n_clink = int(SAMPLE_RATE * 0.003)
    t_clink = np.linspace(0, 0.003, n_clink, endpoint=False)
    clink = np.sin(2 * np.pi * 4800.0 * t_clink) * np.exp(-t_clink * 1100.0) * 0.22

    # 2. Pure crystalline bell harmonics (silky smooth decay)
    decay_rate = 5.5 if is_climax else 7.5
    f1 = np.sin(2 * np.pi * f0 * t) * np.exp(-t * decay_rate)
    f2 = 0.32 * np.sin(2 * np.pi * (f0 * 2.0) * t) * np.exp(-t * (decay_rate * 1.5))
    f3 = 0.12 * np.sin(2 * np.pi * (f0 * 3.0) * t) * np.exp(-t * (decay_rate * 2.2))
    # Inharmonic crystal glass mode (2.756x)
    f_glass = 0.18 * np.sin(2 * np.pi * (f0 * 2.756) * t) * np.exp(-t * (decay_rate * 2.8))

    sig = f1 + f2 + f3 + f_glass
    sig[:len(clink)] += clink

    if is_climax:
        # Full sparkling crystal chord harmony (C7 + E7 + G7)
        c2 = 0.45 * np.sin(2 * np.pi * (f0 * 1.2599) * t) * np.exp(-t * 5.0)  # Major 3rd
        c3 = 0.35 * np.sin(2 * np.pi * (f0 * 1.4983) * t) * np.exp(-t * 5.5)  # Perfect 5th
        c4 = 0.20 * np.sin(2 * np.pi * (f0 * 2.0) * t) * np.exp(-t * 6.5)     # Octave
        sig += c2 + c3 + c4

    # Micro fade out to prevent digital clicks
    fade = int(SAMPLE_RATE * 0.005)
    sig[-fade:] *= np.linspace(1.0, 0.0, fade)

    return sig / np.max(np.abs(sig))

def save_wav(filepath, audio_data, target_peak=0.88):
    """Normalize and write 16-bit PCM WAV."""
    peak = np.max(np.abs(audio_data))
    if peak > 0:
        normalized = (audio_data / peak) * target_peak
    else:
        normalized = audio_data

    int16_samples = np.int16(np.clip(normalized * 32767.0, -32768, 32767))

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with wave.open(filepath, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(int16_samples.tobytes())

def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "assets", "audio", "sfx"))
    print(f"Generating Pure Crystal Ting countdown SFX into: {base_dir}")

    # 5: C6 (1046.50 Hz) - Ting! (0.35s)
    sfx_5 = synth_pure_ting(f0=1046.50, dur=0.35)
    save_wav(os.path.join(base_dir, "countdown_5.wav"), sfx_5)

    # 4: D6 (1174.66 Hz) - Ting! (0.35s)
    sfx_4 = synth_pure_ting(f0=1174.66, dur=0.35)
    save_wav(os.path.join(base_dir, "countdown_4.wav"), sfx_4)

    # 3: E6 (1318.51 Hz) - Ting! (0.35s)
    sfx_3 = synth_pure_ting(f0=1318.51, dur=0.35)
    save_wav(os.path.join(base_dir, "countdown_3.wav"), sfx_3)

    # 2: G6 (1567.98 Hz) - Ting! (0.38s)
    sfx_2 = synth_pure_ting(f0=1567.98, dur=0.38)
    save_wav(os.path.join(base_dir, "countdown_2.wav"), sfx_2)

    # 1: C7 (2093.00 Hz) + E7/G7 Chord - TIIINGGGG! (0.50s)
    sfx_1 = synth_pure_ting(f0=2093.00, dur=0.50, is_climax=True)
    save_wav(os.path.join(base_dir, "countdown_1.wav"), sfx_1)

    # Backward compatibility aliases
    save_wav(os.path.join(base_dir, "countdown_tick.wav"), sfx_5)
    save_wav(os.path.join(base_dir, "countdown_final.wav"), sfx_1)

    print("Successfully generated Pure Crystal Ting countdown SFX!")

if __name__ == "__main__":
    main()
