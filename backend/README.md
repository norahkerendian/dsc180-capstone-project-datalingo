# Backend (FastAPI)

This folder contains the Python API server that powers the "Data Science Chatbot" experience.

## What it does

- Loads a lessons/questions JSON dataset into memory at startup
- Exposes REST endpoints for listing lessons and retrieving questions
- Provides a `POST /chat` endpoint that sends a user message to an LLM **with lesson-scoped context**

## Topic-scoped context (token optimization)

The backend now supports **topic-scoped** context sessions so you can pin _one_ topic’s content once and then chat without re-sending that full context every message.

Key idea:

- The model should only see context for the current topic (e.g. "Seeing the World Through Data") — never other topics.
- The frontend should create a topic session once when the user enters a topic, then reuse the returned `session_id` for subsequent chat messages.

## Key files

- `main.py`
  - FastAPI app entrypoint and all HTTP routes
  - Builds lesson context based on `question_id` or `lesson_id`
  - Calls the OpenAI wrapper and returns the assistant response

- `lessons.py`
  - Loads the lessons JSON file from disk
  - Helper lookups (`get_lesson_by_id`, `get_question_by_id`, etc.)
  - Produces a compact context string (`format_lesson_context`) for the LLM

- `chatbot.py`
  - Loads environment variables (`.env`) and builds the OpenAI client
  - Creates chat completion requests and returns assistant text

- `requirements.txt`
  - Python dependencies for the backend server

## Environment variables

Create `backend/.env` (copy from `backend/.env.example`) and set:

- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (optional)
- `LESSONS_DATA_PATH` (optional; path is relative to `backend/` if not absolute)
- `FRONTEND_URL` (optional; extra CORS origin)

## Running locally

From the repo root:

1. Create a virtual environment and install deps

- `python -m venv .venv`
- `source .venv/bin/activate`
- `pip install -r backend/requirements.txt`

2. Run the API

- `python backend/main.py`

The server starts on `http://localhost:8000`.

## API overview

- `GET /`
  - Health check + number of lessons loaded

- `GET /lessons`
  - Lists lessons without returning full question text

- `GET /lessons/{lesson_id}`
  - Returns a single lesson object

- `GET /questions/{question_id}`
  - Returns a question plus its containing lesson metadata

- `POST /chat`
  - Body: `{ "message": "...", "question_id": 123 }` (or `lesson_id`)
  - Response: `{ "response": "...", "lesson_title": "...", "token_estimate": 456, "session_id": "..." }`

- `POST /chat/session`
  - Initializes/pins a topic session before the user asks questions
  - Body: `{ "topic": "Seeing the World Through Data", "level": 1 }`
  - Response: `{ "session_id": "...", "token_estimate": 1234 }`

- `GET /context/{question_id}`
  - Debug endpoint: returns the exact context string that would be sent to the LLM

## Notes / gotchas

- Context scoping is currently done by selecting the lesson that contains the question and sending that whole lesson’s Q&A as context.
- `token_estimate` is a rough heuristic (chars/4) meant for debugging, not billing accuracy.
