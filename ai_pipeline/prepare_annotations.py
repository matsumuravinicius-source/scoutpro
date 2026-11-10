#!/usr/bin/env python3
"""Convert ScoutPro's annotated match workbook into a model-ready event manifest."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import Counter
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Any

from openpyxl import load_workbook
from openpyxl.utils.datetime import from_excel


SHEET_ALIASES = {
    "video": {"videos", "video"},
    "sync": {"sincronizacao", "sincronizacao dos tempos", "sync"},
    "events": {"acoes", "eventos", "actions"},
}

FIELD_ALIASES = {
    "video_id": {"video_id", "id_video"},
    "file": {"arquivo", "ficheiro", "video", "nome do arquivo"},
    "competition": {"competicao", "competicao nome"},
    "date": {"data", "data do jogo", "data da partida"},
    "team_1": {"equipa 1 e cor", "equipe 1 e cor", "equipa 1", "equipe 1"},
    "team_2": {"equipa 2 e cor", "equipe 2 e cor", "equipa 2", "equipe 2"},
    "resolution": {"resolucao"},
    "duration": {"duracao"},
    "period": {"periodo", "tempo"},
    "period_start": {"inicio do periodo", "inicio do periodo no video", "inicio"},
    "period_end": {"fim do periodo", "fim do periodo no video", "fim"},
    "match_clock_start": {"relogio da partida", "relogio do jogo"},
    "event_id": {"lance_id", "evento_id", "action_id"},
    "video_time": {"tempo no video", "tempo de video", "timestamp video"},
    "match_time": {"tempo da partida", "tempo do jogo"},
    "action": {"acao", "evento", "action"},
    "team": {"equipa", "equipe", "team"},
    "result": {"resultado", "result"},
    "type": {"tipo", "type", "subtipo"},
    "outcome": {"desfecho", "outcome"},
}

ACTION_LABELS = {
    "passe": "pass",
    "interceptacao": "interception",
    "desarme": "tackle",
    "finalizacao": "shot",
    "falta cometida": "foul",
    "escanteio": "corner",
    "impedimento": "offside",
    "gol contra": "own_goal",
}
TYPE_RECOMMENDED_FOR = {"pass", "interception", "tackle", "shot", "corner", "own_goal"}

RESULT_LABELS = {
    "completo": "complete",
    "incompleto": "incomplete",
    "com posse": "possession_won",
    "ganhou posse": "possession_won",
    "sem posse": "possession_not_secured",
    "adversario manteve": "opponent_kept_possession",
    "bola para fora": "out_of_play",
    "pra fora": "out_of_play",
    "defendida": "saved",
    "bloqueada": "blocked",
    "assinalada": "whistled",
    "assinalado": "whistled",
    "golo": "goal",
    "gol": "goal",
    "impedimento": "offside",
}


def normalize(value: Any) -> str:
    text = "" if value is None else str(value).strip().casefold()
    text = unicodedata.normalize("NFKD", text)
    return "".join(character for character in text if not unicodedata.combining(character))


def slug(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "_", normalize(value)).strip("_")


def parse_seconds(value: Any) -> int | None:
    if value is None or value == "":
        return None
    if isinstance(value, timedelta):
        return int(value.total_seconds())
    if isinstance(value, (datetime, time)):
        return value.hour * 3600 + value.minute * 60 + value.second
    if isinstance(value, (int, float)):
        # Excel stores times as a fraction of one day.
        return round(float(value) * 86400)
    pieces = str(value).strip().split(":")
    if not all(piece.isdigit() for piece in pieces) or len(pieces) not in (2, 3):
        return None
    numbers = [int(piece) for piece in pieces]
    if len(numbers) == 2:
        return numbers[0] * 60 + numbers[1]
    return numbers[0] * 3600 + numbers[1] * 60 + numbers[2]


def iso_date(value: Any) -> str | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, (int, float)):
        return from_excel(value).date().isoformat()
    return str(value).strip()


def locate_sheet(workbook: Any, aliases: set[str]) -> Any:
    for sheet in workbook.worksheets:
        if normalize(sheet.title) in aliases:
            return sheet
    raise ValueError(f"Não encontrei uma aba equivalente a: {', '.join(sorted(aliases))}")


def read_table(sheet: Any) -> tuple[dict[str, int], list[dict[str, Any]]]:
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        return {}, []
    header_indexes = {normalize(value): index for index, value in enumerate(rows[0]) if value is not None}
    field_indexes: dict[str, int] = {}
    for field, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            if alias in header_indexes:
                field_indexes[field] = header_indexes[alias]
                break
    records = []
    for row_number, row in enumerate(rows[1:], start=2):
        if not any(value not in (None, "") for value in row):
            continue
        records.append({
            field: row[index] if index < len(row) else None
            for field, index in field_indexes.items()
        } | {"_row": row_number})
    return field_indexes, records


def require_fields(fields: dict[str, int], required: set[str], sheet_name: str) -> None:
    missing = sorted(required - set(fields))
    if missing:
        raise ValueError(f"A aba '{sheet_name}' não contém as colunas necessárias: {', '.join(missing)}")


def period_label(value: Any) -> str:
    value_slug = slug(value)
    if value_slug.startswith("1"):
        return "first_half"
    if value_slug.startswith("2"):
        return "second_half"
    return value_slug or "unknown"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workbook", type=Path, help="Planilha .xlsx com vídeos, sincronização e ações")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).parent / "data")
    args = parser.parse_args()

    workbook = load_workbook(args.workbook, data_only=True, read_only=True)
    video_sheet = locate_sheet(workbook, SHEET_ALIASES["video"])
    sync_sheet = locate_sheet(workbook, SHEET_ALIASES["sync"])
    event_sheet = locate_sheet(workbook, SHEET_ALIASES["events"])

    video_fields, videos = read_table(video_sheet)
    sync_fields, sync_rows = read_table(sync_sheet)
    event_fields, event_rows = read_table(event_sheet)
    require_fields(video_fields, {"video_id"}, video_sheet.title)
    require_fields(sync_fields, {"video_id", "period", "period_start"}, sync_sheet.title)
    require_fields(event_fields, {"video_id", "event_id", "period", "video_time", "match_time", "action", "team"}, event_sheet.title)

    metadata_by_video = {str(video.get("video_id")): video for video in videos if video.get("video_id")}
    sync_by_video_period = {
        (str(row.get("video_id")), period_label(row.get("period"))): row
        for row in sync_rows if row.get("video_id") and row.get("period")
    }
    warnings: list[dict[str, Any]] = []
    seen_ids: set[tuple[str, str]] = set()
    event_records: list[dict[str, Any]] = []
    action_counts: Counter[str] = Counter()
    period_counts: Counter[str] = Counter()
    out_of_sync: list[dict[str, Any]] = []

    for row in event_rows:
        video_id = str(row.get("video_id") or "").strip()
        event_id = str(row.get("event_id") or "").strip()
        event_key = (video_id, event_id)
        if event_key in seen_ids:
            warnings.append({"kind": "duplicate_event_id", "row": row["_row"], "video_id": video_id, "event_id": event_id})
        seen_ids.add(event_key)

        action_raw = str(row.get("action") or "").strip()
        action_key = normalize(action_raw)
        action_label = ACTION_LABELS.get(action_key, slug(action_raw) or "unknown")
        result_raw = str(row.get("result") or "").strip() or None
        result_label = RESULT_LABELS.get(normalize(result_raw), slug(result_raw) if result_raw else None)
        type_raw = str(row.get("type") or "").strip() or None
        type_label = slug(type_raw) if type_raw else None
        period = period_label(row.get("period"))
        video_seconds = parse_seconds(row.get("video_time"))
        match_seconds = parse_seconds(row.get("match_time"))

        labels = [action_label]
        if action_label == "pass" and type_label == "cruzamento":
            labels.append("cross")
        if action_label not in ACTION_LABELS.values():
            warnings.append({"kind": "unmapped_action", "row": row["_row"], "value": action_raw})
        for required in ("video_id", "event_id", "period", "video_time", "match_time", "action", "team"):
            if row.get(required) in (None, ""):
                warnings.append({"kind": "missing_required_value", "row": row["_row"], "field": required})
        if not type_label and action_label in TYPE_RECOMMENDED_FOR:
            warnings.append({"kind": "missing_type", "row": row["_row"], "event_id": event_id, "action": action_label})

        sync = sync_by_video_period.get((video_id, period))
        if sync and video_seconds is not None:
            start_seconds = parse_seconds(sync.get("period_start"))
            end_seconds = parse_seconds(sync.get("period_end"))
            if start_seconds is not None and video_seconds < start_seconds:
                out_of_sync.append({"row": row["_row"], "event_id": event_id, "period": period, "video_time_seconds": video_seconds, "boundary": "before_period_start"})
            if end_seconds is not None and video_seconds > end_seconds:
                out_of_sync.append({"row": row["_row"], "event_id": event_id, "period": period, "video_time_seconds": video_seconds, "boundary": "after_period_end"})

        metadata = metadata_by_video.get(video_id, {})
        event_records.append({
            "video_id": video_id,
            "event_id": event_id,
            "period": period,
            "video_time_seconds": video_seconds,
            "match_time_seconds": match_seconds,
            "team": str(row.get("team") or "").strip() or None,
            "labels": labels,
            "action_label": action_label,
            "result_label": result_label,
            "type_label": type_label,
            "raw": {
                "period": row.get("period"),
                "action": action_raw or None,
                "result": result_raw,
                "type": type_raw,
                "outcome": str(row.get("outcome") or "").strip() or None,
            },
            "match": {
                "competition": metadata.get("competition"),
                "date": iso_date(metadata.get("date")),
                "team_1": metadata.get("team_1"),
                "team_2": metadata.get("team_2"),
                "resolution": metadata.get("resolution"),
                "duration": metadata.get("duration"),
            },
            "source_row": row["_row"],
        })
        action_counts[action_label] += 1
        period_counts[period] += 1

    args.output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = args.output_dir / "events.jsonl"
    report_path = args.output_dir / "validation_report.json"
    manifest_path.write_text("".join(json.dumps(event, ensure_ascii=False) + "\n" for event in event_records), encoding="utf-8")
    report = {
        "source_workbook": args.workbook.name,
        "video_count": len(metadata_by_video),
        "event_count": len(event_records),
        "unique_event_ids": len(seen_ids),
        "events_by_action": dict(sorted(action_counts.items())),
        "events_by_period": dict(sorted(period_counts.items())),
        "warnings": warnings,
        "period_boundary_warnings": out_of_sync,
        "notes": [
            "Os rótulos originais foram preservados em raw; os rótulos normalizados são uma camada de preparação, não validação humana.",
            "Este manifesto contém tempos e classes de eventos. Os recortes de vídeo para treinamento dependem do arquivo de vídeo correspondente.",
        ],
    }
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Eventos preparados: {len(event_records)}")
    print(f"Manifesto: {manifest_path}")
    print(f"Relatório: {report_path}")
    print(f"Avisos: {len(warnings)}; lances fora dos limites de sincronização: {len(out_of_sync)}")


if __name__ == "__main__":
    main()
