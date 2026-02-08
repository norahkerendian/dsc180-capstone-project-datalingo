"""backend.main

FastAPI application entrypoint.

This service exposes a small HTTP API used by the Next.js frontend to:
- list lessons and fetch lesson/question details
- chat with an LLM *constrained* to lesson content

High-level request flow for `POST /chat`:
1) Client sends a user message plus either `question_id` or `lesson_id`
2) We build lesson context (see :mod:`backend.lessons`)
3) We call the OpenAI Chat Completions API (see :mod:`backend.chatbot`)
4) We return the assistant response and a rough context token estimate

Environment variables (loaded via `python-dotenv` in :mod:`backend.chatbot`):
- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (optional)
- `LESSONS_DATA_PATH` (optional)
- `FRONTEND_URL` (optional; additional CORS origin)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import re
from uuid import uuid4
from time import time

from lessons import (
    load_lessons_data,
    get_question_by_id,
    get_lesson_by_id,
    format_lesson_context,
    get_lesson_by_question_id,
    build_topic_context_cache,
    get_topic_context,
    format_mcq_for_display,
)
from chatbot import (
    chat_with_context,
    chat_with_context_with_usage,
    estimate_tokens,
    start_topic_session,
    chat_with_topic_session,
    PROMPT_VERSION,
)

# Load lessons data at import/startup.
#
# This is intentionally done once and kept in memory so typical requests do not
# re-read a large JSON file from disk.
try:
    LESSONS_DATA = load_lessons_data()
    print(f"✓ Loaded {len(LESSONS_DATA)} lessons")
except FileNotFoundError as e:
    print(f"⚠ Warning: {e}")
    LESSONS_DATA = []

# Precompute topic-scoped context once at startup.
# This avoids rebuilding large context strings per request.
TOPIC_CONTEXT_CACHE = build_topic_context_cache(LESSONS_DATA)
print(f"✓ Built {len(TOPIC_CONTEXT_CACHE)} topic contexts")


# In-memory session store (process-local).
#
# Each session pins a single (level, topic) context server-side via OpenAI's
# Responses API, so we don't re-send the full topic context every request.
_TOPIC_SESSIONS: dict[str, dict] = {}
_SESSION_TTL_SECONDS = 60 * 60 * 8  # 8 hours
_SESSION_MAX = 500


_MCQ_ANSWER_LEAK_RE = re.compile(
    r"(?is)\b("
    r"correct\s*answer|"
    r"the\s*correct\s*(option|choice)|"
    r"answer\s*is|answer\s*:|"
    r"([A-D])\s*(is|would\s*be)\s*correct|"
    r"why\s*([A-D])\s*is\s*correct|"
    r"option\s*[A-D]\s*(is|would\s*be)\s*correct|"
    r"choice\s*[A-D]\s*(is|would\s*be)\s*correct"
    r")\b"
)

# Multi-language (non-English) patterns we've observed causing answer leaks.
_MCQ_ANSWER_LEAK_I18N_RE = re.compile(
    r"(?is)("
    # Spanish
    r"respuesta\s+correcta\s*(es|:)\s*[A-D]|"
    r"la\s+respuesta\s+correcta\s*(es|:)\s*[A-D]|"
    r"la\s+opci[oó]n\s+correcta\s*(es|:)\s*[A-D]|"
    r"opci[oó]n\s+correcta\s*(es|:)\s*[A-D]|"
    # Chinese
    r"正确答案\s*(是|：|:)\s*[A-D]|"
    r"答案\s*(是|：|:)\s*[A-D]|"
    r"正确选项\s*(是|：|:)\s*[A-D]"
    r")"
)

_CHOICE_ENUM_RE = re.compile(r"(?m)^\s*[A-D]\s*[\).]\s+")
_BARE_CHOICE_RE = re.compile(
    r"(?is)^\s*(?:hi|hello|hey)?\s*(?:[-—:])?\s*([A-D])\s*[\).\s]*$"
)


def _extract_student_text(full_message: str) -> str:
    """Try to isolate what the student actually typed.

    The frontend often sends a combined message like:
    - question
    - choices
    - 'Student: ...'
    """

    if not isinstance(full_message, str):
        return ""

    marker = "Student:"
    idx = full_message.rfind(marker)
    if idx == -1:
        return full_message.strip()
    return full_message[idx + len(marker) :].strip()


def _sanitize_tutor_response(*, text: str, user_message: str, is_mcq: bool) -> str:
    if not text:
        return text

    lowered = text.lower()
    student_text = _extract_student_text(user_message or "")
    student_lowered = student_text.lower()

    # Prevent random off-topic tangents.
    if "pizza" in lowered and "pizza" not in student_lowered:
        return (
            "I can’t help with unrelated topics right now. "
            "Ask about the current data science concept and I’ll explain it."
        )

    # Prevent leaking MCQ answers.
    if is_mcq and (
        _MCQ_ANSWER_LEAK_RE.search(text)
        or _MCQ_ANSWER_LEAK_I18N_RE.search(text)
        or ("correct" in lowered and _CHOICE_ENUM_RE.search(text))
        or _BARE_CHOICE_RE.match(text)
    ):
        return (
            "I can’t tell you which option is correct.\n\n"
            "Here’s how to decide: look for the choice that matches the definition of data science from the topic "
            "(exploring patterns in data, making predictions, and drawing inferences with uncertainty). "
            "Then check the other choices for mismatches with that definition."
        )

    return text


def _coerce_int(value) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip().isdigit():
        return int(value.strip())
    return None


def _topic_key(*, level: Optional[int], topic: str) -> str:
    lvl = "any" if level is None else str(level)
    return f"level={lvl}|topic={topic.strip()}"


def _prune_sessions() -> None:
    now = time()
    expired = [
        sid
        for sid, s in _TOPIC_SESSIONS.items()
        if (now - float(s.get("last_used_at", 0))) > _SESSION_TTL_SECONDS
    ]
    for sid in expired:
        _TOPIC_SESSIONS.pop(sid, None)

    if len(_TOPIC_SESSIONS) <= _SESSION_MAX:
        return

    # If still too many, drop least-recently-used sessions.
    survivors = sorted(
        _TOPIC_SESSIONS.items(),
        key=lambda kv: float(kv[1].get("last_used_at", 0)),
        reverse=True,
    )[:_SESSION_MAX]
    _TOPIC_SESSIONS.clear()
    _TOPIC_SESSIONS.update({sid: s for sid, s in survivors})

# Initialize FastAPI app
app = FastAPI(
    title="Data Science Chatbot API",
    description="AI-powered chatbot that answers questions based on filtered lesson content",
    version="1.0.0",
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
        "http://127.0.0.1:3000",
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):3000$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------
# Request/Response models
# -------------------------
class ChatRequest(BaseModel):
    """Request body for `POST /chat`.

    Provide exactly one of `question_id` or `lesson_id` to scope the assistant.

    `conversation_history` should be a list of OpenAI-style chat messages like:
    `{"role": "user"|"assistant", "content": "..."}`.
    """
    message: str
    question_id: Optional[int] = None  # Filter by specific question
    lesson_id: Optional[int] = None    # Or filter by lesson
    # New: topic-scoped chat (preferred).
    # If provided, the backend will pin context to this topic (not per question).
    topic: Optional[str] = None
    level: Optional[int] = None
    # New: session id to continue a topic session without re-sending context.
    session_id: Optional[str] = None
    conversation_history: Optional[list[dict]] = None


class ChatResponse(BaseModel):
    """Response body for chat endpoint."""
    response: str
    lesson_title: Optional[str] = None
    topic: Optional[str] = None
    level: Optional[int] = None
    token_estimate: int
    session_id: Optional[str] = None
    usage_input_tokens: Optional[int] = None
    usage_output_tokens: Optional[int] = None
    usage_total_tokens: Optional[int] = None
    scoping_mode: str
    topic_cache_hit: bool


class TopicSessionRequest(BaseModel):
    """Request body for creating/pinning a topic chat session."""

    topic: str
    level: Optional[int] = None
    session_id: Optional[str] = None


class TopicSessionResponse(BaseModel):
    """Response body for topic session initialization."""

    session_id: str
    token_estimate: int


class MCQInfo(BaseModel):
    """MCQ question details response.

    MCQs are nested under lessons as `lesson['mcq_questions']`.
    This response denormalizes the lesson info for convenience.
    """

    id: int
    prompt: str
    choices: list[str]
    hint: Optional[str] = None
    answer_index: Optional[int] = None
    difficulty: Optional[int] = None
    category: Optional[str] = None
    lesson_id: int
    lesson_title: str
    lesson_topic: str


# API Endpoints
@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "message": "Data Science Chatbot API is running",
        "lessons_loaded": len(LESSONS_DATA),
    }


@app.get("/debug/topic-cache")
async def debug_topic_cache(limit: int = 50):
    """Inspect the preprocessed topic context cache (summary only)."""

    safe_limit = max(1, min(int(limit), 200))

    items = [
        {
            "level": lvl,
            "topic": topic,
            "char_count": len(ctx),
            "token_estimate": estimate_tokens(ctx),
        }
        for (lvl, topic), ctx in TOPIC_CONTEXT_CACHE.items()
    ]
    items.sort(key=lambda x: (x["level"] is None, x["level"] or 0, x["topic"]))

    return {
        "topic_context_count": len(TOPIC_CONTEXT_CACHE),
        "showing": safe_limit,
        "items": items[:safe_limit],
    }


@app.get("/debug/question-scope/{question_id}")
async def debug_question_scope(question_id: int):
    """Verify how a question maps to a preprocessed topic context."""

    lesson = get_lesson_by_question_id(LESSONS_DATA, question_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Question not found in lessons dataset")

    topic = str(lesson.get("topic") or "").strip()
    level = _coerce_int(lesson.get("level"))
    topic_ctx = get_topic_context(TOPIC_CONTEXT_CACHE, topic=topic, level=level)

    return {
        "question_id": question_id,
        "lesson_id": lesson.get("id"),
        "lesson_title": lesson.get("title"),
        "topic": topic,
        "level": level,
        "topic_key": _topic_key(level=level, topic=topic) if topic else None,
        "topic_cache_hit": bool(topic_ctx),
        "topic_context_char_count": len(topic_ctx) if topic_ctx else 0,
        "topic_context_token_estimate": estimate_tokens(topic_ctx) if topic_ctx else 0,
        "topic_context_first_line": (topic_ctx.split("\n", 1)[0] if topic_ctx else None),
    }


@app.get("/debug/lesson-scope/{lesson_id}")
async def debug_lesson_scope(lesson_id: int):
    """Verify how a lesson maps to a preprocessed topic context."""

    lesson = get_lesson_by_id(LESSONS_DATA, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found in lessons dataset")

    topic = str(lesson.get("topic") or "").strip()
    level = _coerce_int(lesson.get("level"))
    topic_ctx = get_topic_context(TOPIC_CONTEXT_CACHE, topic=topic, level=level)

    return {
        "lesson_id": lesson.get("id"),
        "lesson_title": lesson.get("title"),
        "topic": topic,
        "level": level,
        "topic_key": _topic_key(level=level, topic=topic) if topic else None,
        "topic_cache_hit": bool(topic_ctx),
        "topic_context_char_count": len(topic_ctx) if topic_ctx else 0,
        "topic_context_token_estimate": estimate_tokens(topic_ctx) if topic_ctx else 0,
        "topic_context_first_line": (topic_ctx.split("\n", 1)[0] if topic_ctx else None),
        "lesson_mcq_count": len(lesson.get("mcq_questions", []) or []),
    }


@app.get("/lessons")
async def list_lessons():
    """List all available lessons (without full question content)."""
    return [
        {
            "id": lesson.get("id"),
            "title": lesson.get("title"),
            "topic": lesson.get("topic"),
            "level": lesson.get("level"),
            "question_count": len(lesson.get("mcq_questions", [])),
        }
        for lesson in LESSONS_DATA
    ]


@app.get("/lessons/{lesson_id}")
async def get_lesson(lesson_id: int):
    """Get a specific lesson by ID."""
    lesson = get_lesson_by_id(LESSONS_DATA, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@app.get("/questions/{question_id}", response_model=MCQInfo)
async def get_question(question_id: int):
    """Get a specific question by ID with its lesson info."""
    question = get_question_by_id(LESSONS_DATA, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with the AI tutor.
    
    Provide either question_id or lesson_id to filter the context.
    The AI will only have access to the relevant lesson content.
    """
    _prune_sessions()

    lesson_context = None  # legacy lesson-scoped context (kept for compatibility)
    lesson_title = None
    topic_context = None
    topic = None
    level = request.level
    topic_session_key = None
    
    # -------------------------
    # Topic-scoped context flow
    # -------------------------
    # Preferred behavior: scope the model to ONE topic at a time.
    # We pin topic context once per session and then continue via session id.
    if request.topic and isinstance(request.topic, str) and request.topic.strip():
        topic = request.topic.strip()
        topic_context = get_topic_context(
            TOPIC_CONTEXT_CACHE,
            topic=topic,
            level=level,
        )

    # Back-compat: derive topic from question_id / lesson_id.
    if not topic_context and request.question_id:
        lesson = get_lesson_by_question_id(LESSONS_DATA, request.question_id)
        if lesson:
            topic = str(lesson.get("topic") or "").strip() or None
            level = level if level is not None else _coerce_int(lesson.get("level"))
            if topic:
                topic_context = get_topic_context(
                    TOPIC_CONTEXT_CACHE,
                    topic=topic,
                    level=_coerce_int(level),
                )
                lesson_title = lesson.get("title")

    if not topic_context and request.lesson_id:
        lesson = get_lesson_by_id(LESSONS_DATA, request.lesson_id)
        if lesson:
            topic = str(lesson.get("topic") or "").strip() or None
            level = level if level is not None else _coerce_int(lesson.get("level"))
            if topic:
                topic_context = get_topic_context(
                    TOPIC_CONTEXT_CACHE,
                    topic=topic,
                    level=_coerce_int(level),
                )
            lesson_title = lesson.get("title")

    # Legacy lesson-scoped fallback (discouraged by the new requirements).
    if not topic_context and request.lesson_id:
        lesson = get_lesson_by_id(LESSONS_DATA, request.lesson_id)
        if lesson:
            lesson_context = format_lesson_context(lesson)
            lesson_title = lesson.get("title")
    
    # If the client asked for scoped chat but we can't find the data,
    # return a 404 so the frontend can show an actionable error.
    if not topic_context and not lesson_context and (
        request.topic or request.question_id or request.lesson_id
    ):
        raise HTTPException(
            status_code=404,
            detail="Lesson/Question not found. Please provide a valid ID."
        )
    
    try:
        # Compose user message.
        # If a question id is provided, include the MCQ prompt/options in the
        # user turn (small), rather than injecting full lesson content per call.
        user_message = request.message
        is_mcq_like = False
        if request.question_id:
            q = get_question_by_id(LESSONS_DATA, request.question_id)
            if q:
                user_message = f"{format_mcq_for_display(q)}\n\nStudent: {request.message}"
                is_mcq_like = True

        if "choices:" in (user_message or "").lower():
            is_mcq_like = True
        if _CHOICE_ENUM_RE.search(user_message or ""):
            is_mcq_like = True

        student_text = _extract_student_text(user_message or "")
        student_lowered = student_text.lower()

        # Preflight: handle clearly off-topic or abusive turns without calling the model.
        if "pizza" in student_lowered:
            return ChatResponse(
                response=(
                    "I can only help with the current data science topic and the quiz question. "
                    "Ask me about the concept in the question and I’ll help with hints."
                ),
                lesson_title=lesson_title,
                topic=topic,
                level=_coerce_int(level),
                token_estimate=estimate_tokens(topic_context) if topic_context else 0,
                session_id=request.session_id,
                usage_input_tokens=None,
                usage_output_tokens=None,
                usage_total_tokens=None,
                scoping_mode="preflight_offtopic",
                topic_cache_hit=bool(topic_context),
            )

        if any(bad in student_lowered for bad in ["fuck you", "fuck u", "f*** you"]):
            return ChatResponse(
                response=(
                    "I’m here to help, but please keep it respectful. "
                    "Ask about the current concept and I’ll give you hints."
                ),
                lesson_title=lesson_title,
                topic=topic,
                level=_coerce_int(level),
                token_estimate=estimate_tokens(topic_context) if topic_context else 0,
                session_id=request.session_id,
                usage_input_tokens=None,
                usage_output_tokens=None,
                usage_total_tokens=None,
                scoping_mode="preflight_abuse",
                topic_cache_hit=bool(topic_context),
            )

        # If we have topic_context, use session-based Responses API.
        if topic_context and topic:
            topic_session_key = _topic_key(
                level=_coerce_int(level),
                topic=topic,
            )

            session_id = request.session_id
            session = _TOPIC_SESSIONS.get(session_id) if session_id else None

            if (
                not session
                or session.get("topic_key") != topic_session_key
                or session.get("prompt_version") != PROMPT_VERSION
            ):
                session_id = uuid4().hex
                previous_response_id = start_topic_session(
                    topic_context=topic_context,
                    topic_key=topic_session_key,
                )
                session = {
                    "topic_key": topic_session_key,
                    "previous_response_id": previous_response_id,
                    "prompt_version": PROMPT_VERSION,
                    "created_at": time(),
                    "last_used_at": time(),
                }
                _TOPIC_SESSIONS[session_id] = session

            assistant_text, new_prev, usage = chat_with_topic_session(
                previous_response_id=session["previous_response_id"],
                user_message=user_message,
            )
            assistant_text = _sanitize_tutor_response(
                text=assistant_text,
                user_message=user_message,
                is_mcq=is_mcq_like,
            )
            session["previous_response_id"] = new_prev
            session["last_used_at"] = time()

            # Token estimate is a rough approximation used for debugging/UX.
            context_tokens = estimate_tokens(topic_context)

            return ChatResponse(
                response=assistant_text,
                lesson_title=lesson_title,
                topic=topic,
                level=_coerce_int(level),
                token_estimate=context_tokens,
                session_id=session_id,
                usage_input_tokens=usage.get("input_tokens"),
                usage_output_tokens=usage.get("output_tokens"),
                usage_total_tokens=usage.get("total_tokens"),
                scoping_mode="topic_session",
                topic_cache_hit=True,
            )

        # Otherwise, fall back to the legacy stateless Chat Completions flow.
        response_text, usage = chat_with_context_with_usage(
            user_message=user_message,
            lesson_context=lesson_context,
            conversation_history=request.conversation_history,
        )

        response_text = _sanitize_tutor_response(
            text=response_text,
            user_message=user_message,
            is_mcq=is_mcq_like,
        )

        context_tokens = estimate_tokens(lesson_context) if lesson_context else 0

        return ChatResponse(
            response=response_text,
            lesson_title=lesson_title,
            topic=topic,
            level=_coerce_int(level),
            token_estimate=context_tokens,
            session_id=None,
            usage_input_tokens=usage.get("input_tokens"),
            usage_output_tokens=usage.get("output_tokens"),
            usage_total_tokens=usage.get("total_tokens"),
            scoping_mode="lesson_stateless" if lesson_context else "unscoped_stateless",
            topic_cache_hit=bool(topic_context),
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error communicating with OpenAI: {str(e)}"
        )


@app.post("/chat/session", response_model=TopicSessionResponse)
async def init_topic_session(request: TopicSessionRequest):
    """Initialize a topic-scoped chat session.

    This endpoint exists so the frontend can preload/pin the topic context
    *before* the user asks questions, avoiding resending the topic context for
    every message.
    """

    _prune_sessions()

    topic = request.topic.strip() if isinstance(request.topic, str) else ""
    if not topic:
        raise HTTPException(status_code=400, detail="Missing topic")

    level = _coerce_int(request.level)
    topic_context = get_topic_context(TOPIC_CONTEXT_CACHE, topic=topic, level=level)
    if not topic_context:
        raise HTTPException(status_code=404, detail="Topic context not found")

    topic_session_key = _topic_key(level=level, topic=topic)

    session_id = request.session_id
    session = _TOPIC_SESSIONS.get(session_id) if session_id else None

    try:
        if (
            not session
            or session.get("topic_key") != topic_session_key
            or session.get("prompt_version") != PROMPT_VERSION
        ):
            session_id = uuid4().hex
            previous_response_id = start_topic_session(
                topic_context=topic_context,
                topic_key=topic_session_key,
            )
            session = {
                "topic_key": topic_session_key,
                "previous_response_id": previous_response_id,
                "prompt_version": PROMPT_VERSION,
                "created_at": time(),
                "last_used_at": time(),
            }
            _TOPIC_SESSIONS[session_id] = session
        else:
            session["last_used_at"] = time()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error communicating with OpenAI: {str(e)}",
        )

    return TopicSessionResponse(
        session_id=session_id,
        token_estimate=estimate_tokens(topic_context),
    )


@app.get("/context/{question_id}")
async def get_context_preview(question_id: int):
    """
    Preview the filtered context that would be sent to the LLM for a question.
    Useful for debugging and understanding token usage.
    """
    lesson = get_lesson_by_question_id(LESSONS_DATA, question_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Question not found")

    topic = str(lesson.get("topic") or "").strip()
    level = lesson.get("level")
    level_int = _coerce_int(level)

    topic_context = get_topic_context(TOPIC_CONTEXT_CACHE, topic=topic, level=level_int)
    if not topic_context:
        raise HTTPException(status_code=404, detail="Topic context not found")

    return {
        "question_id": question_id,
        "topic": topic,
        "level": level_int,
        "context": topic_context,
        "token_estimate": estimate_tokens(topic_context),
        "char_count": len(topic_context),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
