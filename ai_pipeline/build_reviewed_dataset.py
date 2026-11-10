#!/usr/bin/env python3
"""Combine annotated event clips with human-reviewed background clips."""

from __future__ import annotations

import argparse
import csv
import io
import json
from collections import Counter
from pathlib import Path
from typing import Any


def read_csv_rows(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    lines = path.read_text(encoding="utf-8-sig").splitlines()
    if not lines:
        raise ValueError(f"CSV vazio: {path}")
    first = next(csv.reader([lines[0]]))
    if len(first) == 1 and "," in first[0]:
        # Excel may save each comma-separated row as one quoted cell.
        parsed = []
        for line in lines:
            cell = next(csv.reader([line]))[0]
            parsed.append(next(csv.reader([cell])))
        header, values = parsed[0], parsed[1:]
    else:
        parsed = list(csv.reader(io.StringIO("\n".join(lines))))
        header, values = parsed[0], parsed[1:]
    rows = []
    for line_number, values_row in enumerate(values, start=2):
        if not any(value.strip() for value in values_row):
            continue
        if len(values_row) != len(header):
            raise ValueError(f"A linha {line_number} contém {len(values_row)} colunas; esperado: {len(header)}.")
        rows.append({name: value for name, value in zip(header, values_row)})
    return header, rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--clips-dir", type=Path, default=Path(__file__).parent / "data" / "clips")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).parent / "data")
    args = parser.parse_args()

    positive_path = args.clips_dir / "clips.jsonl"
    reviewed_csv = args.clips_dir / "background_candidates.csv"
    if not positive_path.is_file() or not reviewed_csv.is_file():
        raise SystemExit("Preciso de clips.jsonl e background_candidates.csv na pasta de clipes.")

    positives = [json.loads(line) for line in positive_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    headers, backgrounds = read_csv_rows(reviewed_csv)
    required = {"candidate_id", "video_id", "period", "clip_path", "review_status", "review_label"}
    missing_headers = sorted(required - set(headers))
    if missing_headers:
        raise SystemExit(f"Colunas ausentes no CSV de revisão: {', '.join(missing_headers)}")

    unreviewed = [row.get("candidate_id", "") for row in backgrounds if row.get("review_status", "").strip().casefold() not in {"reviewed", "revisado", "revisada"} or not row.get("review_label", "").strip()]
    if unreviewed:
        raise SystemExit(f"Há {len(unreviewed)} candidatos sem revisão ou rótulo.")

    records: list[dict[str, Any]] = []
    missing_files = []
    labels = Counter()
    video_ids = set()
    for clip in positives:
        clip_path = Path(clip["clip_path"])
        if not clip_path.is_file():
            missing_files.append(str(clip_path))
        record = {
            "sample_id": clip.get("event_id"),
            "sample_kind": "event",
            "video_id": clip.get("video_id"),
            "period": clip.get("period"),
            "clip_path": str(clip_path),
            "labels": clip.get("labels", []),
            "action_label": clip.get("action_label"),
            "result_label": clip.get("result_label"),
            "type_label": clip.get("type_label"),
            "team": clip.get("team"),
            "event_video_time_seconds": clip.get("event_video_time_seconds"),
            "clip_start_seconds": clip.get("clip_start_seconds"),
            "clip_end_seconds": clip.get("clip_end_seconds"),
            "review_status": "annotated",
        }
        records.append(record)
        labels.update(record["labels"])
        video_ids.add(record["video_id"])

    normalized_rows = []
    for row in backgrounds:
        label = row["review_label"].strip().casefold()
        clip_path = Path(row["clip_path"])
        if not clip_path.is_file():
            missing_files.append(str(clip_path))
        record = {
            "sample_id": row["candidate_id"],
            "sample_kind": "background" if label == "background" else "event",
            "video_id": row["video_id"],
            "period": row["period"],
            "clip_path": str(clip_path),
            "labels": [label],
            "action_label": None if label == "background" else label,
            "result_label": None,
            "type_label": None,
            "team": None,
            "event_video_time_seconds": None,
            "clip_start_seconds": int(row["video_start_seconds"]),
            "clip_end_seconds": int(row["video_end_seconds"]),
            "review_status": "human_reviewed",
        }
        records.append(record)
        labels.update(record["labels"])
        video_ids.add(record["video_id"])
        normalized_rows.append(row)

    if missing_files:
        raise SystemExit(f"Há {len(missing_files)} caminhos de clipe ausentes; primeiro: {missing_files[0]}")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    normalized_csv_path = args.clips_dir / "background_candidates_normalized.csv"
    with normalized_csv_path.open("w", encoding="utf-8-sig", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        writer.writerows(normalized_rows)

    manifest_path = args.output_dir / "reviewed_dataset.jsonl"
    manifest_path.write_text("".join(json.dumps(record, ensure_ascii=False) + "\n" for record in records), encoding="utf-8")
    report = {
        "event_clip_count": len(positives),
        "reviewed_background_count": sum(1 for row in backgrounds if row["review_label"].strip().casefold() == "background"),
        "reviewed_candidate_count": len(backgrounds),
        "total_samples": len(records),
        "samples_by_label": dict(sorted(labels.items())),
        "video_ids": sorted(value for value in video_ids if value),
        "split_status": "pending_more_matches" if len(video_ids) < 3 else "ready_for_game_level_split",
        "notes": [
            "A amostra background foi confirmada por revisão humana.",
            "Os candidatos continuam sendo do mesmo jogo; não separe clipes deste jogo entre treino, validação e teste.",
        ],
    }
    report_path = args.output_dir / "reviewed_dataset_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Eventos positivos: {len(positives)}")
    print(f"Backgrounds revisados: {report['reviewed_background_count']}")
    print(f"Amostras no manifesto: {len(records)}")
    print(f"Manifesto: {manifest_path}")
    print(f"CSV normalizado: {normalized_csv_path}")
    print(f"Relatório: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
