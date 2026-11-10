#!/usr/bin/env python3
"""Extract compact, event-centered training clips from a prepared JSONL manifest."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


def load_events(path: Path) -> list[dict[str, Any]]:
    events = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError as error:
            raise ValueError(f"JSON inválido na linha {line_number}: {error}") from error
    return events


def safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]+", "_", value).strip("_") or "event"


def ffmpeg_time(seconds: float) -> str:
    whole_seconds = max(0, int(seconds))
    hours, remainder = divmod(whole_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path, help="Arquivo MP4 original da partida")
    parser.add_argument("--annotations", type=Path, default=Path(__file__).parent / "data" / "events.jsonl")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).parent / "data" / "clips")
    parser.add_argument("--before", type=float, default=3.0, help="Segundos de contexto antes do evento (padrão: 3)")
    parser.add_argument("--after", type=float, default=10.0, help="Segundos de contexto depois do evento (padrão: 10)")
    parser.add_argument("--width", type=int, default=426, help="Largura de saída em pixels (padrão: 426)")
    parser.add_argument("--fps", type=int, default=8, help="Frames por segundo (padrão: 8)")
    parser.add_argument("--overwrite", action="store_true", help="Substitui clipes já extraídos")
    args = parser.parse_args()

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        print("FFmpeg não encontrado no PATH. Instale-o e abra um novo terminal antes de executar.", file=sys.stderr)
        return 2
    if not args.video.is_file():
        print(f"Vídeo não encontrado: {args.video}", file=sys.stderr)
        return 2
    if not args.annotations.is_file():
        print(f"Manifesto não encontrado: {args.annotations}. Execute prepare_annotations.py primeiro.", file=sys.stderr)
        return 2
    if args.before < 0 or args.after < 0 or args.before + args.after <= 0:
        print("A janela deve ter duração maior que zero e valores não negativos.", file=sys.stderr)
        return 2
    if args.width < 160 or args.fps < 1:
        print("Use largura de pelo menos 160 px e FPS maior que zero.", file=sys.stderr)
        return 2

    events = load_events(args.annotations)
    video_ids = {event.get("video_id") for event in events if event.get("video_id")}
    if len(video_ids) != 1:
        print(f"O manifesto deve conter exatamente um vídeo nesta etapa; encontrei {len(video_ids)}.", file=sys.stderr)
        return 2
    video_id = next(iter(video_ids))
    ready_events = [
        event for event in events
        if event.get("video_id") == video_id
        and event.get("event_id")
        and isinstance(event.get("video_time_seconds"), (int, float))
        and event.get("labels")
    ]
    if not ready_events:
        print("Não encontrei eventos com ID, tempo de vídeo e rótulos válidos.", file=sys.stderr)
        return 2

    args.output_dir.mkdir(parents=True, exist_ok=True)
    clip_records = []
    failures = []
    for index, event in enumerate(ready_events, start=1):
        event_id = safe_name(str(event["event_id"]))
        label = safe_name("_".join(event["labels"]))
        destination = args.output_dir / f"{safe_name(str(video_id))}_{event_id}_{label}.mp4"
        if destination.exists() and not args.overwrite:
            status = "already_exists"
        else:
            event_seconds = float(event["video_time_seconds"])
            start_seconds = max(0.0, event_seconds - args.before)
            clip_duration = event_seconds - start_seconds + args.after
            command = [
                ffmpeg,
                "-hide_banner", "-loglevel", "error", "-nostdin",
                "-ss", ffmpeg_time(start_seconds),
                "-i", str(args.video.resolve()),
                "-t", f"{clip_duration:.3f}",
                "-vf", f"scale={args.width}:-2:force_original_aspect_ratio=decrease,fps={args.fps}",
                "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            ]
            if args.overwrite:
                command.append("-y")
            else:
                command.append("-n")
            command.append(str(destination))
            result = subprocess.run(command, capture_output=True, text=True, check=False)
            if result.returncode:
                failures.append({"event_id": event["event_id"], "error": result.stderr.strip()[-1000:]})
                print(f"[{index}/{len(ready_events)}] Falha no evento {event_id}", file=sys.stderr)
                continue
            status = "extracted"

        clip_records.append({
            "clip_path": str(destination.resolve()),
            "video_id": video_id,
            "event_id": event["event_id"],
            "period": event.get("period"),
            "event_video_time_seconds": event["video_time_seconds"],
            "clip_start_seconds": max(0.0, float(event["video_time_seconds"]) - args.before),
            "clip_end_seconds": float(event["video_time_seconds"]) + args.after,
            "labels": event["labels"],
            "action_label": event.get("action_label"),
            "result_label": event.get("result_label"),
            "type_label": event.get("type_label"),
            "team": event.get("team"),
            "status": status,
        })
        if index % 50 == 0 or index == len(ready_events):
            print(f"[{index}/{len(ready_events)}] eventos processados")

    manifest_path = args.output_dir / "clips.jsonl"
    manifest_path.write_text("".join(json.dumps(record, ensure_ascii=False) + "\n" for record in clip_records), encoding="utf-8")
    failure_path = args.output_dir / "extraction_errors.json"
    failure_path.write_text(json.dumps(failures, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Clipes prontos: {len(clip_records)} de {len(ready_events)}")
    print(f"Manifesto de clipes: {manifest_path}")
    if failures:
        print(f"Falhas: {len(failures)}. Detalhes: {failure_path}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
