"""backend.lessons

Lesson content loader and filtering utilities.

This module is responsible for reading your lesson/question dataset from disk
and producing *scoped* context strings that are safe to send to the LLM.

Expected JSON shape (high level):
- The file is a JSON array of lessons.
- Each lesson is a dict containing fields like:
    - `id` (int)
    - `title` (str)
    - `topic` (str)
    - `level` (int/str)
    - `questions` (list of dicts with `id`, `question`, `answer`, ...)
    - `metadata` (optional dict)

Design note:
We keep the "data lookup" logic here, so the API layer in :mod:`backend.main`
stays thin and focused on HTTP.
"""

import json
import os
from typing import Optional, Any
from pathlib import Path


# Default path to the lessons JSON file (fallback).
#
# IMPORTANT: Do not read env vars at import time.
# The backend loads `.env` in `chatbot.py`, and `backend/main.py` imports this
# module *before* that happens. We therefore resolve `LESSONS_DATA_PATH` inside
# `load_lessons_data()`.
DEFAULT_LESSONS_PATH_FALLBACK = (
    "../NEW_AIGeneratedData_json/"
    "final_merged_lessons_with_mcqs_16Jan 16, 2026_153124_randomized_16Jan_161140.json"
)


def _resolve_data_path(path: str) -> Path:
    """Resolve a lessons data path.

    - If relative: resolve relative to the backend folder.
    - If missing: try common variants (add/remove trailing `.json`).
    """
    file_path = Path(path)

    if not file_path.is_absolute():
        file_path = Path(__file__).parent / file_path

    if file_path.exists():
        return file_path

    # Some datasets are stored without the `.json` extension.
    candidates: list[Path] = []
    if file_path.suffix.lower() == ".json":
        candidates.append(file_path.with_suffix(""))
    else:
        candidates.append(file_path.with_suffix(file_path.suffix + ".json"))
        candidates.append(Path(str(file_path) + ".json"))

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return file_path


def load_lessons_data(path: Optional[str] = None) -> list[dict]:
    """Load lessons data from a JSON file.

    Args:
        path: Optional override path. If relative, it is resolved relative to
            the backend folder (the folder containing this file).

    Returns:
        A list of lesson dictionaries.
    """
    resolved = path or os.getenv("LESSONS_DATA_PATH", DEFAULT_LESSONS_PATH_FALLBACK)
    file_path = _resolve_data_path(resolved)

    if not file_path.exists():
        raise FileNotFoundError(
            "Lessons data file not found. "
            f"Resolved path: {file_path} (from {resolved!r})"
        )
    
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_lesson_by_id(lessons: list[dict], lesson_id: int) -> Optional[dict]:
    """Find a lesson by its ID."""
    for lesson in lessons:
        if lesson.get("id") == lesson_id:
            return lesson
    return None


def get_lesson_by_question_id(lessons: list[dict], question_id: int) -> Optional[dict]:
    """
    Find the lesson that contains a specific MCQ question ID.
    Questions are nested within lessons as lesson['mcq_questions'][i]['id'].
    """
    for lesson in lessons:
        mcqs = lesson.get("mcq_questions", [])
        for question in mcqs:
            if question.get("id") == question_id:
                return lesson
    return None


def _coerce_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip().isdigit():
        return int(value.strip())
    return None


def normalize_mcq(question: dict) -> dict:
    """Normalize a dataset MCQ dict to a stable internal shape."""
    # Field name variants we’ve seen / might see.
    prompt = question.get("prompt") or question.get("question") or ""
    choices = question.get("choices") or question.get("options") or []
    hint = question.get("hint")
    hints = question.get("hints")
    answer_index = (
        question.get("answerIndex")
        if "answerIndex" in question
        else question.get("answer_index")
    )

    normalized = {
        "id": _coerce_int(question.get("id")),
        "prompt": prompt,
        "choices": choices if isinstance(choices, list) else [],
        "hint": hint if isinstance(hint, str) else None,
        "hints": hints if isinstance(hints, list) else None,
        "answer_index": _coerce_int(answer_index),
        "difficulty": _coerce_int(question.get("difficulty")),
        "category": question.get("category"),
        "lesson_id": _coerce_int(question.get("lessonId") or question.get("lesson_id")),
    }
    return normalized


def get_mcq_by_id(lessons: list[dict], question_id: int) -> Optional[dict]:
    """Find a specific MCQ by its ID across all lessons."""
    for lesson in lessons:
        mcqs = lesson.get("mcq_questions", [])
        for q in mcqs:
            if q.get("id") == question_id:
                normalized = normalize_mcq(q)
                return {
                    **normalized,
                    "lesson_id": lesson.get("id"),
                    "lesson_title": lesson.get("title"),
                    "lesson_topic": lesson.get("topic"),
                    "lesson_level": lesson.get("level"),
                }
    return None


def get_question_by_id(lessons: list[dict], question_id: int) -> Optional[dict]:
    """Backward-compatible alias for MCQ lookups.

    The project now uses `mcq_questions` as the question bank.
    """
    return get_mcq_by_id(lessons, question_id)


def format_mcq_for_display(mcq: dict) -> str:
    """Format a single MCQ as compact plain text (for LLM context)."""
    prompt = mcq.get("prompt") or ""
    choices = mcq.get("choices") or []
    hint = mcq.get("hint")

    parts = ["## Current Multiple-Choice Question", f"Prompt: {prompt}"]
    if choices:
        parts.append("Choices:")
        for i, c in enumerate(choices):
            parts.append(f"- ({i}) {c}")
    if isinstance(hint, str) and hint.strip():
        parts.append(f"Hint: {hint.strip()}")
    return "\n".join(parts)


def format_lesson_context(lesson: dict) -> str:
    """
    Format a lesson's content for use as LLM context.

    Returns a concise, plain-text representation optimized for token efficiency.
    Today this includes:
    - lesson metadata (title/topic/level)
    - lesson content markdown if available (`content_md`)
    - optional open-ended Q&A (`questions`) if present
    """
    parts = [
        f"# {lesson.get('title', 'Untitled Lesson')}",
        f"Topic: {lesson.get('topic', 'Unknown')}",
        f"Level: {lesson.get('level', 'N/A')}",
    ]
    
    # Add metadata if available
    metadata = lesson.get("metadata", {})
    if metadata.get("source_path"):
        parts.append(f"Source: {metadata['source_path']}")
    
    # Primary lesson content (preferred for tutoring context)
    content_md = lesson.get("content_md") or lesson.get("unmodified_content_md")
    if isinstance(content_md, str) and content_md.strip():
        parts.append("\n## Lesson Content")
        parts.append(content_md.strip())

    # Optional open-ended Q&A as additional study material
    questions = lesson.get("questions", [])
    if isinstance(questions, list) and questions:
        parts.append("\n## Key Concepts (Q&A)")
        for q in questions:
            parts.append(f"\nQ: {q.get('question', '')}")
            parts.append(f"A: {q.get('answer', '')}")
    
    return "\n".join(parts)


def get_filtered_context(lessons: list[dict], question_id: int) -> Optional[str]:
    """
    Get the filtered lesson context for a specific question ID.

    This is the primary entrypoint used by `POST /chat`.
    It finds the lesson that contains the question and returns that lesson's
    formatted context.
    
    Returns the formatted lesson content or None if question not found.
    """
    lesson = get_lesson_by_question_id(lessons, question_id)
    if not lesson:
        return None

    mcq = get_mcq_by_id(lessons, question_id)
    lesson_text = format_lesson_context(lesson)

    # Put the current question *inside* the context so the tutor can respond
    # to "why is (b) correct?" style messages without the frontend needing to
    # restate the full prompt/options every time.
    if mcq:
        return f"{lesson_text}\n\n{format_mcq_for_display(mcq)}"

    return lesson_text
