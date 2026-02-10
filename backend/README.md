# Backend

## Service overview

We built the backend as a FastAPI service that loads lesson data, serves lesson and question endpoints, and provides a tutor chat API scoped to lesson or topic context.

## Tech stack

We use:

- Python 3.8+
- FastAPI
- Uvicorn
- OpenAI SDK
- Pydantic
- python-dotenv
- httpx

## Folder structure

The backend code is organized around a small set of modules:

- [backend/main.py](backend/main.py) — FastAPI app and routes.
- [backend/lessons.py](backend/lessons.py) — lesson data loading and context formatting.
- [backend/chatbot.py](backend/chatbot.py) — OpenAI client wrapper and chat helpers.
- [backend/console_mcq_test.py](backend/console_mcq_test.py) — CLI test harness.
- [backend/requirements.txt](backend/requirements.txt) — Python dependencies.
- [db/](db/) — database helpers and models (if used).

## Installation and setup

We typically start by creating a virtual environment and installing dependencies:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Environment variables

We rely on environment variables to configure API access and dataset paths.

Required:

- `OPENAI_API_KEY`

Optional:

- `OPENAI_MODEL`
- `LESSONS_DATA_PATH` (path to JSON lesson dataset)
- `FRONTEND_URL` (additional CORS origin)

We keep a `.env` file in the backend folder for local development when needed.

## How to run locally

We run the server directly from the backend folder:

```bash
python main.py
```

The service listens on `http://localhost:8000` by default.

## Database setup or migrations

We keep a small database helper under [db/](db/) that uses SQLAlchemy to connect to Postgres and insert questions. The connection is defined in `db/database.py` and reads these environment variables:

- `USER`
- `PASSWORD`
- `HOST`
- `PORT`
- `DBNAME`

The helper builds a `postgresql://` URL with `sslmode=require`, creates an engine, and uses a session factory for inserts and queries. We also include `db/insert_question.py` for loading a JSON file into the `questions` table and `db/main.py` for listing questions. There are no migration scripts in the repo yet; lesson data is still loaded from JSON by default (see `LESSONS_DATA_PATH`).

## API / service overview

The service exposes endpoints for lessons, questions, and tutoring. The current routes are:

- `GET /` — health check and lesson count
- `GET /lessons` — list lessons
- `GET /lessons/{lesson_id}` — lesson detail
- `GET /questions/{question_id}` — question detail with lesson context
- `POST /chat` — tutor chat for a question or lesson
- `POST /chat/session` — initialize topic-scoped session
- `GET /context/{question_id}` — preview topic context for a question
- `GET /debug/topic-cache` — inspect cached topic context
- `GET /debug/question-scope/{question_id}` — verify question-to-topic mapping
- `GET /debug/lesson-scope/{lesson_id}` — verify lesson-to-topic mapping

## Development workflow

Our typical loop is to update lesson JSON and restart the server to reload. For quick checks, we use the CLI harness:

```bash
python console_mcq_test.py --n 5 --seed 1
```

## Troubleshooting

We usually check the following first:

- Missing `OPENAI_API_KEY`: we set it in `.env` or our shell.
- Lesson file not found: we set `LESSONS_DATA_PATH` to the correct JSON file.
- Frontend CORS errors: we set `FRONTEND_URL` to the frontend origin.
