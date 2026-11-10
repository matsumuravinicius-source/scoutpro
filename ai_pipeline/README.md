# ScoutPro AI data preparation

This first milestone turns the annotated workbook into an event manifest suitable for later video-clip extraction and model training. It does not train a model or alter the source workbook.

## Prepare annotations

Install the Python dependency and run:

```powershell
python -m pip install -r ai_pipeline/requirements.txt
python ai_pipeline/prepare_annotations.py "C:\path\to\lances para a IA.xlsx"
```

The command writes two local-only files under `ai_pipeline/data/`:

- `events.jsonl`: one structured event per line, with video and match clocks in seconds, normalized labels, and original annotation values.
- `validation_report.json`: event and period counts, missing fields, duplicate IDs, unknown actions, missing types, and events outside the synchronized period windows.

Generated data and source videos are ignored by Git. Keep the original workbook unchanged; fix annotations in the workbook and rerun the importer.

## Current boundary

The manifest is not a trained detector. The source video is required for the next stage: extracting event-centered clips and frames. Keep the video local under `ai_pipeline/videos/` or supply its path to the next processing tool; do not commit full match footage to the application repository.

## Extract event-centered clips

Install FFmpeg and make sure `ffmpeg` is available on `PATH`. Then run:

```powershell
python ai_pipeline/extract_event_clips.py "C:\path\to\match.mp4"
```

The default clip window is 3 seconds before and 10 seconds after each annotated event. The extractor converts each clip to 426 px wide at 8 FPS without audio, which keeps the first dataset small enough to inspect and iterate on. Adjust `--before`, `--after`, `--width` and `--fps` when comparing model inputs. The output is local under `ai_pipeline/data/clips/` and includes `clips.jsonl` plus any extraction errors.

## Review background candidates

Candidate background windows are selected only from synchronized game periods and do not overlap the annotated positive-clip windows. They are **not automatically labeled as negative**: review every generated clip and fill `review_label` with `background` only when no target action appears. If an action is visible, add it to the source workbook instead. Run:

```powershell
python ai_pipeline/generate_background_candidates.py "C:\path\to\match.mp4" "C:\path\to\lances para a IA.xlsx"
```

This writes `background_candidates.csv` and 13-second review clips under `ai_pipeline/data/clips/background_review/` by default. Keep the train/validation/test split grouped by complete match; with one match the current data can support a pipeline prototype, but not an independent evaluation.

After filling in `review_status` and `review_label`, combine the reviewed background samples with event clips:

```powershell
python ai_pipeline/build_reviewed_dataset.py
```

This validates that every referenced clip exists, writes `reviewed_dataset.jsonl`, creates a normalized copy of the review CSV, and produces `reviewed_dataset_report.json`. It intentionally does not split a single match across train, validation and test.

## Train the first event/background baseline

The current lightweight trainer uses only the bundled NumPy package and FFmpeg. It learns a binary visual classifier from handcrafted frame color, edge and motion-difference features:

```powershell
python ai_pipeline/train_event_background.py
```

It writes a local `.npz` model and a report. The chronological holdout from this one match is only a diagnostic; the baseline does not identify action types and should not be treated as a production model.
