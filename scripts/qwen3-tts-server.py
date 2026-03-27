#!/usr/bin/env python3
"""
Qwen3-TTS HTTP server.
Loads model once, serves TTS requests via HTTP.

Usage:
  uv run --with qwen-tts --with faster-whisper scripts/qwen3-tts-server.py \
    --ref-audio assets/voice/myvoice.m4a \
    --ref-text "오늘 영상에서는 AI를 활용한 자동화 시스템에 대해 이야기해보려고 합니다. ..."

API:
  GET  /health  → { "status": "ready" }
  POST /generate → { "audioPath": "...", "vttPath": "...", "durationMs": N }
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from threading import Lock

import numpy as np
import soundfile as sf
import torch

from qwen_tts import Qwen3TTSModel

# --- Globals (set during startup) ---
tts_model: Qwen3TTSModel | None = None
voice_clone_prompt = None
model_device: str = "cpu"
generate_lock = Lock()

# --- Whisper (optional) ---
whisper_model = None

def try_load_whisper():
    global whisper_model
    try:
        from faster_whisper import WhisperModel
        whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
        print("[INFO] faster-whisper loaded (base model)", file=sys.stderr)
    except ImportError:
        print("[WARN] faster-whisper not available, VTT generation disabled", file=sys.stderr)
    except Exception as e:
        print(f"[WARN] faster-whisper load failed: {e}", file=sys.stderr)


def generate_vtt(audio_path: str, vtt_path: str) -> bool:
    """Generate VTT from audio using faster-whisper. Returns True on success."""
    if whisper_model is None:
        return False

    try:
        segments, _ = whisper_model.transcribe(
            audio_path, language="ko", word_timestamps=True
        )

        with open(vtt_path, "w", encoding="utf-8") as f:
            f.write("WEBVTT\n\n")
            for segment in segments:
                if segment.words:
                    for word in segment.words:
                        start = format_vtt_time(word.start)
                        end = format_vtt_time(word.end)
                        # edge-tts uses comma separator — match that format
                        f.write(f"{start} --> {end}\n{word.word.strip()}\n\n")
                else:
                    start = format_vtt_time(segment.start)
                    end = format_vtt_time(segment.end)
                    f.write(f"{start} --> {end}\n{segment.text.strip()}\n\n")

        return True
    except Exception as e:
        print(f"[WARN] VTT generation failed: {e}", file=sys.stderr)
        return False


def format_vtt_time(seconds: float) -> str:
    """Format seconds to VTT timestamp with comma separator (edge-tts compat)."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def wav_to_mp3(wav_path: str, mp3_path: str) -> bool:
    """Convert WAV to MP3 using ffmpeg. Returns True on success."""
    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", wav_path,
                "-codec:a", "libmp3lame", "-q:a", "2",
                "-loglevel", "error",
                mp3_path,
            ],
            check=True,
            capture_output=True,
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"[ERROR] ffmpeg conversion failed: {e}", file=sys.stderr)
        return False


class TTSHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress default access logs, use stderr for important messages
        pass

    def _send_json(self, status: int, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            status = "ready" if tts_model is not None else "loading"
            self._send_json(200, {
                "status": status,
                "model": model_device,
                "whisper": whisper_model is not None,
            })
        else:
            self._send_json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/generate":
            self._send_json(404, {"error": "not found"})
            return

        if tts_model is None:
            self._send_json(503, {"error": "model not loaded"})
            return

        # Read request body
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        try:
            req = json.loads(body)
        except json.JSONDecodeError:
            self._send_json(400, {"error": "invalid JSON"})
            return

        text = req.get("text", "").strip()
        output_path = req.get("outputPath", "")
        want_vtt = req.get("whisperVtt", False)

        if not text:
            self._send_json(400, {"error": "text is required"})
            return
        if not output_path:
            self._send_json(400, {"error": "outputPath is required"})
            return

        # Ensure output directory
        out_dir = os.path.dirname(output_path)
        if out_dir and not os.path.exists(out_dir):
            os.makedirs(out_dir, exist_ok=True)

        # Serialize generation (model is not thread-safe)
        with generate_lock:
            try:
                result = self._generate(text, output_path, want_vtt)
                self._send_json(200, result)
            except Exception as e:
                print(f"[ERROR] Generation failed: {e}", file=sys.stderr)
                self._send_json(500, {"error": str(e)})

    def _generate(self, text: str, output_path: str, want_vtt: bool) -> dict:
        t0 = time.time()

        # Generate waveform
        wavs, sr = tts_model.generate_voice_clone(
            text=text,
            language="Auto",
            voice_clone_prompt=voice_clone_prompt,
        )

        wav = wavs[0]
        duration_ms = int(len(wav) / sr * 1000)
        gen_time = time.time() - t0

        # Save as WAV (temp), then convert to MP3
        is_mp3 = output_path.lower().endswith(".mp3")

        if is_mp3:
            # Write temp WAV, convert to MP3
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp_wav = tmp.name
            sf.write(tmp_wav, wav, sr)

            if not wav_to_mp3(tmp_wav, output_path):
                # Fallback: save as WAV with .mp3 extension won't work
                # Save as WAV with corrected extension
                wav_path = output_path.rsplit(".", 1)[0] + ".wav"
                sf.write(wav_path, wav, sr)
                output_path = wav_path
                print(f"[WARN] ffmpeg failed, saved as WAV: {wav_path}", file=sys.stderr)

            # Keep temp WAV for whisper (if needed), clean up after
            vtt_source = tmp_wav
        else:
            sf.write(output_path, wav, sr)
            vtt_source = output_path

        # VTT generation
        vtt_path = None
        if want_vtt and whisper_model is not None:
            vtt_path = output_path.rsplit(".", 1)[0] + ".vtt"
            if not generate_vtt(vtt_source, vtt_path):
                vtt_path = None

        # Cleanup temp WAV
        if is_mp3 and os.path.exists(vtt_source) and vtt_source != output_path:
            try:
                os.unlink(vtt_source)
            except OSError:
                pass

        print(
            f"[INFO] Generated {duration_ms}ms in {gen_time:.1f}s → {os.path.basename(output_path)}",
            file=sys.stderr,
        )

        return {
            "audioPath": os.path.abspath(output_path),
            "vttPath": os.path.abspath(vtt_path) if vtt_path else None,
            "durationMs": duration_ms,
            "sampleRate": sr,
            "genTimeS": round(gen_time, 1),
        }


def detect_device(requested: str | None) -> str:
    if requested and requested != "auto":
        return requested
    if torch.backends.mps.is_available():
        try:
            t = torch.zeros(1, device="mps")
            del t
            return "mps"
        except Exception:
            pass
    return "cpu"


def main():
    global tts_model, voice_clone_prompt, model_device

    parser = argparse.ArgumentParser(description="Qwen3-TTS HTTP server")
    parser.add_argument("--model", default="Qwen/Qwen3-TTS-12Hz-1.7B-Base")
    parser.add_argument("--ref-audio", required=True, help="Reference audio path")
    parser.add_argument("--ref-text", default=None, help="Reference audio transcript (ICL)")
    parser.add_argument("--device", default="auto", help="Device: auto, mps, cpu")
    parser.add_argument("--dtype", default="float32", choices=["bfloat16", "float16", "float32"])
    parser.add_argument("--port", type=int, default=9876)
    parser.add_argument("--host", default="127.0.0.1")

    args = parser.parse_args()

    device = detect_device(args.device)
    model_device = device

    dtype_map = {"bfloat16": torch.bfloat16, "float16": torch.float16, "float32": torch.float32}
    dtype = dtype_map[args.dtype]
    if device == "mps" and dtype == torch.bfloat16:
        print("[WARN] MPS does not support bfloat16, using float32", file=sys.stderr)
        dtype = torch.float32

    print(f"[INFO] Device: {device}, dtype: {args.dtype}", file=sys.stderr)

    # Load model
    t0 = time.time()
    print(f"[INFO] Loading model: {args.model}...", file=sys.stderr)

    try:
        tts_model = Qwen3TTSModel.from_pretrained(
            args.model, device_map=device, dtype=dtype, attn_implementation=None,
        )
    except Exception as e:
        if device == "mps":
            print(f"[WARN] MPS failed ({e}), retrying on CPU...", file=sys.stderr)
            device = "cpu"
            model_device = "cpu"
            tts_model = Qwen3TTSModel.from_pretrained(
                args.model, device_map="cpu", dtype=torch.float32, attn_implementation=None,
            )
        else:
            raise

    print(f"[INFO] Model loaded in {time.time() - t0:.1f}s", file=sys.stderr)

    # Pre-encode reference audio (voice clone prompt caching)
    print(f"[INFO] Pre-encoding reference audio: {args.ref_audio}...", file=sys.stderr)
    t1 = time.time()

    use_icl = args.ref_text is not None and len(args.ref_text.strip()) > 0
    prompt_items = tts_model.create_voice_clone_prompt(
        ref_audio=args.ref_audio,
        ref_text=args.ref_text if use_icl else None,
        x_vector_only_mode=not use_icl,
    )
    voice_clone_prompt = prompt_items

    print(f"[INFO] Voice prompt cached in {time.time() - t1:.1f}s (ICL: {use_icl})", file=sys.stderr)

    # Load whisper (optional)
    try_load_whisper()

    # Start HTTP server
    server = HTTPServer((args.host, args.port), TTSHandler)
    print(f"[INFO] Server ready at http://{args.host}:{args.port}", file=sys.stderr)
    print(f"[INFO] Endpoints: GET /health, POST /generate", file=sys.stderr)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[INFO] Shutting down...", file=sys.stderr)
        server.shutdown()


if __name__ == "__main__":
    main()
