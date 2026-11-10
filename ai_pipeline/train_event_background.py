#!/usr/bin/env python3
"""Train a small visual event/background prototype from reviewed ScoutPro clips."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import numpy as np


FRAME_WIDTH = 64
FRAME_HEIGHT = 36
FRAME_COUNT = 7
FRAMES_PER_SECOND = "1/2"


def extract_features(clip_path: Path, ffmpeg: str) -> np.ndarray:
    command = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin",
        "-i", str(clip_path),
        "-vf", f"fps={FRAMES_PER_SECOND},scale={FRAME_WIDTH}:{FRAME_HEIGHT}:flags=area,format=rgb24",
        "-frames:v", str(FRAME_COUNT), "-f", "rawvideo", "pipe:1",
    ]
    result = subprocess.run(command, capture_output=True, check=False)
    expected_bytes = FRAME_WIDTH * FRAME_HEIGHT * 3 * FRAME_COUNT
    if result.returncode or len(result.stdout) != expected_bytes:
        detail = result.stderr.decode("utf-8", errors="replace")[-500:]
        raise RuntimeError(f"Falha ao extrair frames de {clip_path}: {detail or f'{len(result.stdout)} bytes'}")

    frames = np.frombuffer(result.stdout, dtype=np.uint8).reshape(FRAME_COUNT, FRAME_HEIGHT, FRAME_WIDTH, 3)
    features: list[float] = []
    y_edges = np.linspace(0, FRAME_HEIGHT, 3, dtype=int)
    x_edges = np.linspace(0, FRAME_WIDTH, 5, dtype=int)
    gray_frames = []

    for frame in frames:
        normalized = frame.astype(np.float32) / 255.0
        gray = 0.299 * normalized[:, :, 0] + 0.587 * normalized[:, :, 1] + 0.114 * normalized[:, :, 2]
        gray_frames.append(gray)

        gx = np.gradient(gray, axis=1)
        gy = np.gradient(gray, axis=0)
        magnitude = np.sqrt(gx * gx + gy * gy)
        angle = (np.arctan2(gy, gx) + np.pi) % (2 * np.pi)

        for row in range(2):
            for column in range(4):
                y0, y1 = y_edges[row], y_edges[row + 1]
                x0, x1 = x_edges[column], x_edges[column + 1]
                cell = normalized[y0:y1, x0:x1]
                for channel in range(3):
                    histogram, _ = np.histogram(cell[:, :, channel], bins=8, range=(0, 1))
                    features.extend((histogram / max(1, histogram.sum())).tolist())
                cell_magnitude = magnitude[y0:y1, x0:x1]
                edge_histogram, _ = np.histogram(
                    angle[y0:y1, x0:x1], bins=8, range=(0, 2 * np.pi), weights=cell_magnitude
                )
                edge_total = float(edge_histogram.sum())
                features.extend((edge_histogram / edge_total if edge_total else edge_histogram).tolist())
        features.extend([float(gray.mean()), float(gray.std())])

    for previous, current in zip(gray_frames, gray_frames[1:]):
        difference = np.abs(current - previous)
        for row in range(2):
            for column in range(4):
                y0, y1 = y_edges[row], y_edges[row + 1]
                x0, x1 = x_edges[column], x_edges[column + 1]
                features.append(float(difference[y0:y1, x0:x1].mean()))

    return np.asarray(features, dtype=np.float32)


def sigmoid(values: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(values, -35, 35)))


def weighted_log_loss(probabilities: np.ndarray, labels: np.ndarray, weights: np.ndarray) -> float:
    probabilities = np.clip(probabilities, 1e-7, 1 - 1e-7)
    losses = -(labels * np.log(probabilities) + (1 - labels) * np.log(1 - probabilities))
    return float(np.sum(losses * weights) / np.sum(weights))


def binary_metrics(probabilities: np.ndarray, labels: np.ndarray, threshold: float = 0.5) -> dict[str, float | int]:
    predictions = probabilities >= threshold
    true_positive = int(np.sum(predictions & (labels == 1)))
    false_positive = int(np.sum(predictions & (labels == 0)))
    false_negative = int(np.sum(~predictions & (labels == 1)))
    true_negative = int(np.sum(~predictions & (labels == 0)))
    precision = true_positive / max(1, true_positive + false_positive)
    recall = true_positive / max(1, true_positive + false_negative)
    return {
        "threshold": threshold,
        "accuracy": float((true_positive + true_negative) / max(1, len(labels))),
        "precision_event": precision,
        "recall_event": recall,
        "f1_event": 2 * precision * recall / max(1e-9, precision + recall),
        "true_positive": true_positive,
        "false_positive": false_positive,
        "false_negative": false_negative,
        "true_negative": true_negative,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=Path(__file__).parent / "data" / "reviewed_dataset.jsonl")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).parent / "data")
    parser.add_argument("--epochs", type=int, default=250)
    parser.add_argument("--learning-rate", type=float, default=0.03)
    parser.add_argument("--l2", type=float, default=0.001)
    parser.add_argument("--patience", type=int, default=30)
    parser.add_argument("--validation-fraction", type=float, default=0.2)
    args = parser.parse_args()

    import shutil

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit("FFmpeg não encontrado no PATH.")
    if not args.dataset.is_file():
        raise SystemExit(f"Manifesto não encontrado: {args.dataset}")

    samples = [json.loads(line) for line in args.dataset.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not samples:
        raise SystemExit("O manifesto não contém amostras.")
    for sample in samples:
        sample["clip_start_seconds"] = float(sample["clip_start_seconds"])
        sample["clip_end_seconds"] = float(sample["clip_end_seconds"])
        sample["label"] = 0 if sample["sample_kind"] == "background" else 1
        if not Path(sample["clip_path"]).is_file():
            raise SystemExit(f"Clipe ausente: {sample['clip_path']}")

    max_video_time = max(sample["clip_end_seconds"] for sample in samples)
    cutoff = max_video_time * (1 - args.validation_fraction)
    train_indices = [i for i, sample in enumerate(samples) if sample["clip_end_seconds"] <= cutoff]
    validation_indices = [i for i, sample in enumerate(samples) if sample["clip_start_seconds"] >= cutoff]
    crossing_indices = [i for i, sample in enumerate(samples) if i not in train_indices and i not in validation_indices]
    if len(train_indices) < 10 or len(validation_indices) < 10:
        raise SystemExit("A divisão temporal não gerou amostras suficientes para treino e validação diagnóstica.")
    if len({samples[i]["label"] for i in train_indices}) < 2 or len({samples[i]["label"] for i in validation_indices}) < 2:
        raise SystemExit("A divisão temporal precisa conter eventos e backgrounds nos dois blocos.")

    features = []
    usable_samples = []
    feature_errors = []
    for position, sample in enumerate(samples, start=1):
        try:
            features.append(extract_features(Path(sample["clip_path"]), ffmpeg))
            usable_samples.append(sample)
        except RuntimeError as error:
            feature_errors.append({"sample_id": sample.get("sample_id"), "clip_path": sample["clip_path"], "error": str(error)})
            print(f"Clipe ignorado por arquivo inválido: {sample.get('sample_id')}", flush=True)
        if position % 25 == 0 or position == len(samples):
            print(f"Frames convertidos: {position}/{len(samples)}", flush=True)
    x = np.stack(features).astype(np.float32)
    samples = usable_samples
    train_indices = [i for i, sample in enumerate(samples) if sample["clip_end_seconds"] <= cutoff]
    validation_indices = [i for i, sample in enumerate(samples) if sample["clip_start_seconds"] >= cutoff]
    crossing_indices = [i for i, sample in enumerate(samples) if i not in train_indices and i not in validation_indices]
    y = np.asarray([sample["label"] for sample in samples], dtype=np.float32)
    train_x = x[train_indices]
    train_y = y[train_indices]
    validation_x = x[validation_indices]
    validation_y = y[validation_indices]

    mean = train_x.mean(axis=0)
    scale = train_x.std(axis=0)
    scale[scale < 1e-5] = 1.0
    train_x = np.clip((train_x - mean) / scale, -8, 8)
    validation_x = np.clip((validation_x - mean) / scale, -8, 8)

    class_counts = np.bincount(train_y.astype(np.int64), minlength=2).astype(np.float32)
    class_weights = len(train_y) / np.maximum(2 * class_counts, 1)
    sample_weights = class_weights[train_y.astype(np.int64)]
    weights = np.zeros(train_x.shape[1], dtype=np.float32)
    bias = np.float32(0.0)
    first_moment = np.zeros_like(weights)
    second_moment = np.zeros_like(weights)
    first_bias = 0.0
    second_bias = 0.0
    best_loss = float("inf")
    best_epoch = 0
    best_weights = weights.copy()
    best_bias = float(bias)
    stale_epochs = 0
    beta1, beta2, epsilon = 0.9, 0.999, 1e-8

    for epoch in range(1, args.epochs + 1):
        probabilities = sigmoid(train_x @ weights + bias)
        error = (probabilities - train_y) * sample_weights / np.sum(sample_weights)
        gradient = train_x.T @ error + args.l2 * weights
        gradient_bias = float(np.sum(error))

        first_moment = beta1 * first_moment + (1 - beta1) * gradient
        second_moment = beta2 * second_moment + (1 - beta2) * gradient * gradient
        first_bias = beta1 * first_bias + (1 - beta1) * gradient_bias
        second_bias = beta2 * second_bias + (1 - beta2) * gradient_bias * gradient_bias
        correction1 = 1 - beta1 ** epoch
        correction2 = 1 - beta2 ** epoch
        weights -= args.learning_rate * (first_moment / correction1) / (np.sqrt(second_moment / correction2) + epsilon)
        bias -= args.learning_rate * (first_bias / correction1) / (np.sqrt(second_bias / correction2) + epsilon)

        validation_probabilities = sigmoid(validation_x @ weights + bias)
        validation_loss = weighted_log_loss(validation_probabilities, validation_y, np.ones_like(validation_y))
        if validation_loss < best_loss - 1e-5:
            best_loss = validation_loss
            best_epoch = epoch
            best_weights = weights.copy()
            best_bias = float(bias)
            stale_epochs = 0
        else:
            stale_epochs += 1
        if epoch % 25 == 0 or epoch == 1:
            print(f"Época {epoch}: perda de validação {validation_loss:.4f}", flush=True)
        if stale_epochs >= args.patience:
            break

    validation_probabilities = sigmoid(validation_x @ best_weights + best_bias)
    metrics = binary_metrics(validation_probabilities, validation_y)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    model_path = args.output_dir / "event_background_baseline.npz"
    np.savez_compressed(
        model_path,
        weights=best_weights,
        bias=np.asarray([best_bias], dtype=np.float32),
        feature_mean=mean,
        feature_scale=scale,
        frame_width=np.asarray([FRAME_WIDTH]),
        frame_height=np.asarray([FRAME_HEIGHT]),
        frame_count=np.asarray([FRAME_COUNT]),
    )
    report = {
        "model_type": "numpy_logistic_visual_baseline",
        "task": "event_vs_background",
        "samples_total": len(samples),
        "events_total": int(np.sum(y)),
        "background_total": int(len(y) - np.sum(y)),
        "train_samples": len(train_indices),
        "train_events": int(np.sum(y[train_indices])),
        "train_background": int(len(train_indices) - np.sum(y[train_indices])),
        "validation_samples": len(validation_indices),
        "validation_events": int(np.sum(y[validation_indices])),
        "validation_background": int(len(validation_indices) - np.sum(y[validation_indices])),
        "excluded_boundary_samples": len(crossing_indices),
        "skipped_invalid_clips": feature_errors,
        "validation_scheme": "hold out the final chronological 20% of this one match; diagnostic only, not an independent match test",
        "best_epoch": best_epoch,
        "validation_loss": best_loss,
        "validation_metrics_at_threshold_0_5": metrics,
        "known_limits": [
            "This prototype predicts only event versus background; it does not classify the event type.",
            "It uses handcrafted color, edge and frame-difference features rather than a pretrained deep video model.",
            "All samples come from one match, so validation results do not establish generalization to other games.",
        ],
    }
    report_path = args.output_dir / "event_background_baseline_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Modelo: {model_path}")
    print(f"Relatório: {report_path}")
    print(json.dumps(metrics, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
