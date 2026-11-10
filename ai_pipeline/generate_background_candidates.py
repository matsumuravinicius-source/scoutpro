#!/usr/bin/env python3
"""Create review-only clips from time gaps not covered by annotated event clips."""

from __future__ import annotations

import argparse
import csv
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

from openpyxl import load_workbook

from prepare_annotations import (
    SHEET_ALIASES,
    locate_sheet,
    parse_seconds,
    period_label,
    read_table,
    require_fields,
)


def fmt_time(seconds: int) -> str:
    hours, remainder = divmod(max(0, seconds), 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def merge_intervals(intervals: list[tuple[int, int]], start: int, end: int) -> list[tuple[int, int]]:
    clipped = sorted((max(start, left), min(end, right)) for left, right in intervals if right > start and left < end)
    merged: list[list[int]] = []
    for left, right in clipped:
        if right <= left:
            continue
        if not merged or left > merged[-1][1]:
            merged.append([left, right])
        else:
            merged[-1][1] = max(merged[-1][1], right)
    return [(left, right) for left, right in merged]


def list_gaps(start: int, end: int, occupied: list[tuple[int, int]], window: int) -> list[tuple[int, int]]:
    gaps = []
    cursor = start
    for left, right in occupied:
        if left - cursor >= window:
            gaps.append((cursor, left))
        cursor = max(cursor, right)
    if end - cursor >= window:
        gaps.append((cursor, end))

    windows = []
    for gap_start, gap_end in gaps:
        position = gap_start
        while position + window <= gap_end:
            windows.append((position, position + window))
            position += window
    return windows


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


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path, help="Arquivo MP4 original da partida")
    parser.add_argument("workbook", type=Path, help="Planilha original com a aba Sincronização")
    parser.add_argument("--annotations", type=Path, default=Path(__file__).parent / "data" / "events.jsonl")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).parent / "data" / "clips")
    parser.add_argument("--before", type=int, default=3, help="Contexto anterior aos eventos já marcados")
    parser.add_argument("--after", type=int, default=10, help="Contexto posterior aos eventos já marcados")
    parser.add_argument("--window", type=int, default=13, help="Duração de cada candidato em segundos")
    parser.add_argument("--width", type=int, default=426)
    parser.add_argument("--fps", type=int, default=8)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        print("FFmpeg não encontrado no PATH.", file=sys.stderr)
        return 2
    if not args.video.is_file() or not args.workbook.is_file() or not args.annotations.is_file():
        print("Verifique os caminhos do vídeo, da planilha e do manifesto de eventos.", file=sys.stderr)
        return 2
    if args.before < 0 or args.after < 0 or args.window < 1:
        print("As durações devem ser inteiros não negativos e a janela deve ser maior que zero.", file=sys.stderr)
        return 2

    events = load_events(args.annotations)
    video_ids = {event.get("video_id") for event in events if event.get("video_id")}
    if len(video_ids) != 1:
        print(f"Esperava anotações de um único vídeo; encontrei {len(video_ids)}.", file=sys.stderr)
        return 2
    video_id = next(iter(video_ids))
    event_windows: dict[str, list[tuple[int, int]]] = {}
    for event in events:
        if event.get("video_id") != video_id or not isinstance(event.get("video_time_seconds"), (int, float)):
            continue
        event_time = int(event["video_time_seconds"])
        event_windows.setdefault(event.get("period", "unknown"), []).append(
            (max(0, event_time - args.before), event_time + args.after)
        )

    workbook = load_workbook(args.workbook, data_only=True, read_only=True)
    sync_sheet = locate_sheet(workbook, SHEET_ALIASES["sync"])
    sync_fields, sync_rows = read_table(sync_sheet)
    require_fields(sync_fields, {"video_id", "period", "period_start", "period_end"}, sync_sheet.title)

    candidates: list[dict[str, Any]] = []
    for row in sync_rows:
        if str(row.get("video_id") or "") != str(video_id):
            continue
        period = period_label(row.get("period"))
        period_start = parse_seconds(row.get("period_start"))
        period_end = parse_seconds(row.get("period_end"))
        if period_start is None or period_end is None or period_end <= period_start:
            raise ValueError(f"Limites de sincronização inválidos para {period}.")
        covered = merge_intervals(event_windows.get(period, []), period_start, period_end)
        for window_start, window_end in list_gaps(period_start, period_end, covered, args.window):
            candidate_number = len(candidates) + 1
            candidates.append({
                "candidate_id": f"BG{candidate_number:04d}",
                "video_id": video_id,
                "period": period,
                "video_start_seconds": window_start,
                "video_end_seconds": window_end,
                "video_start": fmt_time(window_start),
                "video_end": fmt_time(window_end),
                "review_status": "needs_review",
                "review_label": "",
                "review_notes": "",
            })

    if not candidates:
        print("Não encontrei janelas livres com a duração escolhida.")
        return 0

    args.output_dir.mkdir(parents=True, exist_ok=True)
    candidate_clips_dir = args.output_dir / "background_review"
    candidate_clips_dir.mkdir(parents=True, exist_ok=True)
    errors = []
    for index, candidate in enumerate(candidates, start=1):
        clip_path = candidate_clips_dir / f"{candidate['candidate_id']}.mp4"
        candidate["clip_path"] = str(clip_path.resolve())
        if clip_path.exists() and not args.overwrite:
            candidate["clip_status"] = "already_exists"
        else:
            command = [
                ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin",
                "-ss", fmt_time(candidate["video_start_seconds"]),
                "-i", str(args.video.resolve()),
                "-t", str(args.window),
                "-vf", f"scale={args.width}:-2:force_original_aspect_ratio=decrease,fps={args.fps}",
                "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            ]
            command.append("-y" if args.overwrite else "-n")
            command.append(str(clip_path))
            result = subprocess.run(command, capture_output=True, text=True, check=False)
            if result.returncode:
                errors.append({"candidate_id": candidate["candidate_id"], "error": result.stderr.strip()[-1000:]})
                candidate["clip_status"] = "error"
            else:
                candidate["clip_status"] = "extracted"
        if index % 25 == 0 or index == len(candidates):
            print(f"[{index}/{len(candidates)}] candidatos processados")

    csv_path = args.output_dir / "background_candidates.csv"
    columns = [
        "candidate_id", "video_id", "period", "video_start", "video_end",
        "video_start_seconds", "video_end_seconds", "clip_path", "clip_status",
        "review_status", "review_label", "review_notes",
    ]
    with csv_path.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(candidates)
    error_path = args.output_dir / "background_extraction_errors.json"
    error_path.write_text(json.dumps(errors, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Candidatos: {len(candidates)}; clipes extraídos: {sum(c['clip_status'] != 'error' for c in candidates)}; falhas: {len(errors)}")
    print(f"Lista para revisão: {csv_path}")
    print(f"Clipes: {candidate_clips_dir}")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
