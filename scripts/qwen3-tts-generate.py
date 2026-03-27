#!/usr/bin/env python3
"""
Qwen3-TTS single-shot CLI generator.
Phase 0: Quality verification + debugging tool.

Usage:
  uv run --with qwen-tts scripts/qwen3-tts-generate.py \
    --text "습관의 힘은 단순한 반복이 아니라, 정체성의 변화에서 시작됩니다." \
    --output /tmp/test-qwen3.wav \
    --ref-audio assets/voice/myvoice.m4a \
    --ref-text "오늘 영상에서는 AI를 활용한 자동화 시스템에 대해 이야기해보려고 합니다."
"""

import argparse
import json
import os
import sys
import time

import numpy as np
import soundfile as sf
import torch

from qwen_tts import Qwen3TTSModel


def detect_device(requested: str | None) -> str:
    """Auto-detect best available device: MPS → CPU."""
    if requested and requested != "auto":
        return requested

    if torch.backends.mps.is_available():
        try:
            # Quick MPS sanity check
            t = torch.zeros(1, device="mps")
            del t
            return "mps"
        except Exception:
            pass

    return "cpu"


def main():
    parser = argparse.ArgumentParser(
        description="Generate TTS audio using Qwen3-TTS (voice clone)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--text", required=True, help="Text to synthesize")
    parser.add_argument("--output", required=True, help="Output audio file path (.wav)")
    parser.add_argument("--ref-audio", required=True, help="Reference audio file path")
    parser.add_argument(
        "--ref-text",
        default=None,
        help="Reference audio transcript (for ICL mode, better quality)",
    )
    parser.add_argument(
        "--model",
        default="Qwen/Qwen3-TTS-12Hz-1.7B-Base",
        help="Model checkpoint (HuggingFace repo or local path)",
    )
    parser.add_argument(
        "--device",
        default="auto",
        help="Device: auto, mps, cpu (default: auto)",
    )
    parser.add_argument(
        "--dtype",
        default="float32",
        choices=["bfloat16", "float16", "float32"],
        help="Model dtype (default: float32 for MPS compat)",
    )

    args = parser.parse_args()

    device = detect_device(args.device)
    dtype_map = {
        "bfloat16": torch.bfloat16,
        "float16": torch.float16,
        "float32": torch.float32,
    }
    dtype = dtype_map[args.dtype]

    # MPS doesn't support bfloat16
    if device == "mps" and dtype == torch.bfloat16:
        print("[WARN] MPS does not support bfloat16, falling back to float32", file=sys.stderr)
        dtype = torch.float32

    print(f"[INFO] Device: {device}, dtype: {args.dtype}", file=sys.stderr)
    print(f"[INFO] Model: {args.model}", file=sys.stderr)
    print(f"[INFO] Ref audio: {args.ref_audio}", file=sys.stderr)

    # Load model
    t0 = time.time()
    print("[INFO] Loading model...", file=sys.stderr)

    try:
        tts = Qwen3TTSModel.from_pretrained(
            args.model,
            device_map=device,
            dtype=dtype,
            attn_implementation=None,  # No flash-attn on MPS/CPU
        )
    except Exception as e:
        if device == "mps":
            print(f"[WARN] MPS load failed ({e}), retrying on CPU...", file=sys.stderr)
            device = "cpu"
            tts = Qwen3TTSModel.from_pretrained(
                args.model,
                device_map="cpu",
                dtype=torch.float32,
                attn_implementation=None,
            )
        else:
            raise

    load_time = time.time() - t0
    print(f"[INFO] Model loaded in {load_time:.1f}s", file=sys.stderr)

    # Verify ref audio exists
    if not os.path.exists(args.ref_audio):
        print(f"[ERROR] Reference audio not found: {args.ref_audio}", file=sys.stderr)
        sys.exit(1)

    # Generate
    t1 = time.time()
    print(f"[INFO] Generating speech for: {args.text[:60]}...", file=sys.stderr)

    use_icl = args.ref_text is not None and len(args.ref_text.strip()) > 0

    try:
        wavs, sr = tts.generate_voice_clone(
            text=args.text,
            language="Auto",
            ref_audio=args.ref_audio,
            ref_text=args.ref_text if use_icl else None,
            x_vector_only_mode=not use_icl,
        )
    except Exception as e:
        if device == "mps":
            print(f"[WARN] MPS generation failed ({e}), retrying on CPU...", file=sys.stderr)
            tts = Qwen3TTSModel.from_pretrained(
                args.model,
                device_map="cpu",
                dtype=torch.float32,
                attn_implementation=None,
            )
            wavs, sr = tts.generate_voice_clone(
                text=args.text,
                language="Auto",
                ref_audio=args.ref_audio,
                ref_text=args.ref_text if use_icl else None,
                x_vector_only_mode=not use_icl,
            )
        else:
            raise

    gen_time = time.time() - t1

    wav = wavs[0]
    duration_ms = int(len(wav) / sr * 1000)

    print(f"[INFO] Generated {duration_ms}ms audio in {gen_time:.1f}s (SR: {sr})", file=sys.stderr)

    # Ensure output directory exists
    out_dir = os.path.dirname(args.output)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    # Save WAV
    sf.write(args.output, wav, sr)
    print(f"[INFO] Saved to: {args.output}", file=sys.stderr)

    # Output JSON result to stdout
    result = {
        "audioPath": os.path.abspath(args.output),
        "durationMs": duration_ms,
        "sampleRate": sr,
        "device": device,
        "loadTimeS": round(load_time, 1),
        "genTimeS": round(gen_time, 1),
    }
    print(json.dumps(result))


if __name__ == "__main__":
    main()
