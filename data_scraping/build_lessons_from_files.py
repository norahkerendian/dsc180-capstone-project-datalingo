#!/usr/bin/env python3
"""
build_lessons_from_files.py

Converts a directory of Markdown files and Jupyter notebooks (.ipynb)
into a JSON array of lesson objects.

Usage:
    python build_lessons_from_files.py --md_dir path/to/textbook/chapters --output inferential_lessons.json

Key behavior:
  - .md files -> read and use content
  - .ipynb files -> extract markdown cells only (code cells ignored)
  - Each file becomes one lesson (Option A)
  - Timestamps are current UTC ISO format
  - Estimates reading minutes = ceil(words / 200)
  - IDs are stable hashes derived from file path
"""

import os
import json
import re
import argparse
import hashlib
from datetime import datetime, timezone
from typing import List, Tuple

# -----------------------
# Helpers / Utilities
# -----------------------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s/]+", "_", text)
    text = re.sub(r"_+", "_", text)
    return text.strip("_")

def stable_id_from_path(path: str) -> int:
    # Use first 8 hex digits of md5 as a stable integer id
    h = hashlib.md5(path.encode("utf-8")).hexdigest()[:8]
    return int(h, 16)

def estimate_minutes_from_text(text: str, wpm: int = 200) -> Tuple[int, int]:
    words = len(re.findall(r"\w+", text))
    minutes = max(1, (words + wpm - 1) // wpm)
    return minutes, words

def first_heading_from_md(text: str) -> str:
    # Find first markdown H1 or H2 (lines starting with #)
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("#"):
            # remove leading "#" and whitespace
            return re.sub(r"^#+\s*", "", line).strip()
    return ""

def normalize_markdown(md_text: str) -> str:
    # Basic cleaning: trim trailing whitespace, convert CRLF, collapse many blank lines
    text = md_text.replace("\r\n", "\n").replace("\r", "\n")
    # remove cell metadata lines that sometimes appear like <!-- ... --> or HTML comments with metadata
    text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)
    # collapse 3+ newlines to 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"

# -----------------------
# File readers
# -----------------------

def read_markdown_file(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        txt = f.read()
    return normalize_markdown(txt)

def read_ipynb_markdown(path: str) -> str:
    """
    Read a .ipynb file (JSON). Extract markdown cells and join them with blank lines.
    Ignores code cells and outputs.
    """
    import json as _json
    with open(path, "r", encoding="utf-8") as f:
        nb = _json.load(f)
    md_cells: List[str] = []
    for cell in nb.get("cells", []):
        if cell.get("cell_type") == "markdown":
            # cell source can be a list of lines or a single string
            src = cell.get("source", "")
            if isinstance(src, list):
                cell_text = "".join(src)
            else:
                cell_text = str(src)
            md_cells.append(cell_text)
    combined = "\n\n".join(md_cells)
    return normalize_markdown(combined)

# -----------------------
# Inference heuristics
# -----------------------

def infer_topic_from_path(path: str) -> str:
    """
    Very small heuristic: look at the path parts / filename for keywords.
    Customize to suit your taxonomy.
    """
    lower = path.lower()
    if "python" in lower or "computational" in lower or "programming" in lower:
        return "Python"
    if "visual" in lower or "plot" in lower or "matplotlib" in lower:
        return "Visualization"
    if "probab" in lower or "probability" in lower:
        return "Probability"
    if "inferen" in lower or "inference" in lower or "hypothesis" in lower:
        return "Inference"
    if "regression" in lower:
        return "Regression"
    if "causal" in lower:
        return "Causality"
    if "tables" in lower or "dataframes" in lower or "pandas" in lower:
        return "Data"
    return "Data Science"

def infer_level_from_path(path: str) -> int:
    """
    Heuristic: if top-level directory under chapters is numeric (e.g. '01'), use that
    to infer level. Otherwise default to 1.
    Levels capped between 1 and 6.
    """
    parts = path.replace("\\", "/").split("/")
    # find the part after "chapters" if present
    if "chapters" in parts:
        idx = parts.index("chapters")
        # next part might be '01' or a filename
        if idx + 1 < len(parts):
            candidate = parts[idx + 1]
            m = re.match(r"0?(\d+)$", candidate)
            if m:
                val = int(m.group(1))
                # map to level (1..6)
                lvl = max(1, min(6, (val - 1) // 4 + 1))
                return lvl
    # fallback: look for any numeric directory in path
    for p in parts:
        m = re.match(r"0?(\d+)$", p)
        if m:
            val = int(m.group(1))
            lvl = max(1, min(6, (val - 1) // 4 + 1))
            return lvl
    return 1

# -----------------------
# Builder
# -----------------------

def build_lesson_from_file(path: str, root_dir: str) -> dict:
    ext = os.path.splitext(path)[1].lower()
    if ext == ".md":
        content_md = read_markdown_file(path)
    elif ext == ".ipynb":
        content_md = read_ipynb_markdown(path)
    else:
        raise ValueError(f"Unsupported extension for {path}")

    # derive title: try first heading, else filename
    title = first_heading_from_md(content_md) or os.path.splitext(os.path.basename(path))[0].replace("_", " ").title()
    slug = slugify(os.path.relpath(path, root_dir))
    lesson_id = stable_id_from_path(os.path.relpath(path, root_dir))
    now = now_iso()
    estimated_minutes, word_count = estimate_minutes_from_text(content_md)

    lesson = {
        "id": lesson_id,
        "slug": slug,
        "title": title,
        "content_md": content_md,
        "topic": infer_topic_from_path(path),
        "level": infer_level_from_path(path),
        "created_at": now,
        "updated_at": now,
        "metadata": {
            "source": "Data 8 Textbook (local copy)",
            "source_path": os.path.relpath(path, start=root_dir),
            "word_count": word_count,
            "estimated_minutes": estimated_minutes
        },
        "questions": []
    }
    return lesson

# -----------------------
# Main runner
# -----------------------

def collect_files(root_dir: str, include_patterns: List[str] = None) -> List[str]:
    """
    Recursively collect .md and .ipynb files in root_dir.
    Returns sorted list for stable ordering.
    """
    allowed_exts = {".md", ".ipynb"}
    files = []
    for dirpath, _, filenames in os.walk(root_dir):
        for fn in sorted(filenames):
            _, ext = os.path.splitext(fn)
            if ext.lower() in allowed_exts:
                full = os.path.join(dirpath, fn)
                files.append(full)
    # Sort by path for deterministic order
    files.sort()
    return files

def main():
    parser = argparse.ArgumentParser(description="Convert md + ipynb files into JSON lessons")
    parser.add_argument("--md_dir", required=True, help="Root directory containing chapter files (example: textbook/chapters)")
    parser.add_argument("--output", default="inferential_lessons.json", help="Output JSON file")
    parser.add_argument("--save-md", default=None, help="Optional directory to save cleaned markdown for inspection")
    parser.add_argument("--exclude", nargs="*", default=[], help="List of filename substrings to exclude")
    args = parser.parse_args()

    root_dir = args.md_dir
    if not os.path.isdir(root_dir):
        print(f"ERROR: md_dir '{root_dir}' not found or not a directory.")
        return

    files = collect_files(root_dir)
    print(f"Found {len(files)} files (.md + .ipynb) under {root_dir}")

    lessons = []
    for path in files:
        rel = os.path.relpath(path, root_dir)
        if any(ex in rel for ex in args.exclude):
            print(f"Skipping (excluded): {rel}")
            continue
        try:
            lesson = build_lesson_from_file(path, root_dir)
        except Exception as e:
            print(f"ERROR processing {rel}: {e}")
            continue
        lessons.append(lesson)

        # Optionally save cleaned markdown for review
        if args.save_md:
            os.makedirs(args.save_md, exist_ok=True)
            outname = slugify(os.path.splitext(rel)[0]) + ".md"
            with open(os.path.join(args.save_md, outname), "w", encoding="utf-8") as f:
                f.write("# " + lesson["title"] + "\n\n")
                f.write(lesson["content_md"])

    # Write JSON array
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(lessons, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(lessons)} lessons to {args.output}")

if __name__ == "__main__":
    main()

# python build_lessons_from_files.py --md_dir chapters --output inferential_lessons.json --save-md cleaned_md