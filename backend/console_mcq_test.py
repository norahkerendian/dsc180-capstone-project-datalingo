"""Console-only MCQ runner (temporary test harness).

This script mimics the intended user flow without the frontend:
- load the lessons dataset (via LESSONS_DATA_PATH)
- "assign" a small set of MCQs
- present one question at a time
- allow the user to ask the AI tutor questions using the same /chat logic

Run from repo root:
- `python backend/console_mcq_test.py --n 5 --seed 1`

Requirements:
- `OPENAI_API_KEY` set (in backend/.env or environment)
- `LESSONS_DATA_PATH` set to the FOR_USE dataset (optional if fallback works)
"""

from __future__ import annotations
import argparse
import random
import sys
from typing import Optional

from lessons import load_lessons_data, get_mcq_by_id, get_filtered_context
from chatbot import chat_with_context, estimate_tokens


def _print_question(mcq: dict) -> None:
    print("\n" + "=" * 72)
    print(f"Lesson: {mcq.get('lesson_title')} | Topic: {mcq.get('lesson_topic')} | Level: {mcq.get('lesson_level')}")
    print(f"Q{mcq.get('id')}: {mcq.get('prompt')}")
    print("-")

    choices = mcq.get("choices") or []
    for i, choice in enumerate(choices):
        print(f"  {i}: {choice}")

    hint = mcq.get("hint")
    if isinstance(hint, str) and hint.strip():
        print("\n(Type `hint` to show a hint.)")

    print("Commands: `answer <idx>`, `hint`, `ai <message>`, `reveal`, `next`, `quit`")


def _check_answer(mcq: dict, user_index: int) -> None:
    correct_index = mcq.get("answer_index")
    if correct_index is None:
        print("No answer key available for this question.")
        return

    if user_index == correct_index:
        print("Correct.")
    else:
        choices = mcq.get("choices") or []
        correct_text = choices[correct_index] if 0 <= correct_index < len(choices) else "(unknown)"
        print(f"Not quite. Correct index is {correct_index}: {correct_text}")


def run_session(n: int, seed: Optional[int], lesson_id: Optional[int]) -> None:
    lessons = load_lessons_data()

    # Build a flat list of all MCQ IDs (optionally filtered by lesson)
    mcq_ids: list[int] = []
    for lesson in lessons:
        if lesson_id is not None and lesson.get("id") != lesson_id:
            continue
        for q in lesson.get("mcq_questions", []) or []:
            qid = q.get("id")
            if isinstance(qid, int):
                mcq_ids.append(qid)

    if not mcq_ids:
        raise SystemExit("No MCQs found (check LESSONS_DATA_PATH / lesson_id filter).")

    rng = random.Random(seed)
    rng.shuffle(mcq_ids)
    assigned = mcq_ids[: max(1, min(n, len(mcq_ids)))]

    print(f"Assigned {len(assigned)} question(s).")
    if lesson_id is not None:
        print(f"Lesson filter: {lesson_id}")

    total = len(assigned)
    for idx_in_set, qid in enumerate(assigned, start=1):
        mcq = get_mcq_by_id(lessons, qid)
        if not mcq:
            continue

        conversation_history: list[dict] = []
        print(f"\n(Question {idx_in_set}/{total})")
        _print_question(mcq)

        while True:
            raw = input("> ").strip()
            if not raw:
                continue

            cmd = raw.lower()

            if cmd in {"quit", "exit", "q"}:
                return

            if cmd in {"next", "n"}:
                if idx_in_set < total:
                    print("Moving to next question...")
                else:
                    print("No more assigned questions. Ending session.")
                break

            if cmd == "hint":
                hint = mcq.get("hint")
                if isinstance(hint, str) and hint.strip():
                    print(f"Hint: {hint.strip()}")
                else:
                    print("No hint available.")
                continue

            if cmd == "reveal":
                correct_index = mcq.get("answer_index")
                if correct_index is None:
                    print("No answer key available.")
                else:
                    choices = mcq.get("choices") or []
                    correct_text = choices[correct_index] if 0 <= correct_index < len(choices) else "(unknown)"
                    print(f"Answer: {correct_index} -> {correct_text}")
                continue

            if cmd.startswith("answer "):
                try:
                    idx = int(raw.split(maxsplit=1)[1])
                except Exception:
                    print("Usage: answer <idx>")
                    continue
                _check_answer(mcq, idx)
                continue

            if cmd.startswith("ai "):
                user_message = raw.split(" ", 1)[1].strip()
                if not user_message:
                    print("Usage: ai <message>")
                    continue

                lesson_context = get_filtered_context(lessons, qid)
                response_text = chat_with_context(
                    user_message=user_message,
                    lesson_context=lesson_context,
                    conversation_history=conversation_history,
                )

                # Update conversation state for multi-turn within this question
                conversation_history.append({"role": "user", "content": user_message})
                conversation_history.append({"role": "assistant", "content": response_text})

                context_tokens = estimate_tokens(lesson_context) if lesson_context else 0
                print("\n--- AI Tutor ---")
                print(response_text)
                print(f"(context token estimate: {context_tokens})")
                continue

            print("Unknown command. Try: answer/hint/ai/reveal/next/quit")

    print("\nSession complete.")


def main() -> None:
    # VS Code sometimes injects clickable link fragments like
    # `http://_vscodecontentref_/1` when copying commands from chat/editor.
    # They are not real CLI args and will break argparse, so we strip them.
    sys.argv = [
        a
        for a in sys.argv
        if not (
            isinstance(a, str)
            and (a.startswith("http://_vscodecontentref_/") or a.startswith("https://_vscodecontentref_/"))
        )
    ]

    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=5, help="Number of questions to assign")
    parser.add_argument("--seed", type=int, default=1, help="Random seed for reproducible assignment")
    parser.add_argument("--lesson-id", type=int, default=None, help="Restrict to a single lesson")
    args = parser.parse_args()

    run_session(n=args.n, seed=args.seed, lesson_id=args.lesson_id)


if __name__ == "__main__":
    main()
