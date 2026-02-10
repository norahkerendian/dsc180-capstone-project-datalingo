# DataLingo - Full-Stack Learning Platform

## Project Title and Description

### What the system is

DataLingo is a full-stack system we built to generate, serve, and interact with beginner-friendly data science learning content. It combines a content generation workflow, a Python backend API, and a Next.js frontend application in one repository.

### Why it exists

We built this project to create structured, reusable lesson content and make it accessible through a consistent API and user interface. Our goal is to reduce the manual effort of content creation while still giving learners a guided experience with quizzes and tutor-style explanations.

### Who it is for

We designed the repository for developers and contributors who want to:

- generate and curate lesson datasets
- run or extend the backend API
- build or iterate on the frontend learning experience
- understand the overall system architecture and data flow

## Project Goals

### Problems being solved

We focus on three connected problems:

1. Producing structured lesson and quiz data from raw or semi-structured sources.
2. Serving that data in a consistent, queryable format via a backend API.
3. Delivering an interactive UI that allows learners to explore lessons and get tutoring help.

### Intended impact

Our intended impact is a reproducible pipeline for generating lesson content and a platform that makes the content usable for learning and experimentation.

## System Overview

### High-level explanation

The system has three major parts: a content generation workflow, a backend API, and a frontend application. The workflow produces JSON datasets, the backend loads and serves them, and the frontend renders the lessons and calls the backend for tutoring support.

### Major components

- Content workflows (n8n JSON exports and preprocessing scripts)
- Backend service (FastAPI)
- Frontend app (Next.js)
- Data artifacts (JSON lesson/question datasets)

### How they interact

We run the system as a simple pipeline:

1. Workflows generate or curate lesson data into JSON files.
2. The backend reads these JSON files and exposes lesson and chat endpoints.
3. The frontend fetches lessons and uses the chat endpoints for tutoring.

## Architecture Overview

### Backend role

The backend is a FastAPI service that loads lesson data once at startup, caches topic-level context, and exposes endpoints for lesson listings, question lookup, and tutor chat. We added guardrails to avoid leaking MCQ answers and maintain topic-scoped chat sessions to reduce repeated context payloads.

### Frontend role

The frontend is a Next.js application that renders lesson content, quizzes, and an embedded tutor chat widget. We connect it to the backend APIs through environment configuration so local and hosted deployments can use the same code paths.

### Workflow/data pipeline role

The workflow layer contains n8n exports and helper scripts that transform raw input data into structured lesson and MCQ datasets. These outputs are stored as JSON files and serve as the primary data source for the backend.

### Storage/data role

We store data primarily as JSON files in versioned folders. The backend loads these files directly. We also keep database helpers in `db/` and Supabase client code in the frontend, but the definitive system-of-record depends on the configured environment.

## Data Flow Explanation

### Input sources

We draw inputs from:

- Raw or curated datasets in [ogData/](ogData/)
- Intermediate or generated datasets in [AIGeneratedData_json/](AIGeneratedData_json/) and [NEW_AIGeneratedData_json/](NEW_AIGeneratedData_json/)
- Workflow definitions in [workflows/](workflows/)

### Processing steps

Our processing flow is:

1. Data is collected and cleaned in notebooks and scripts under [data_scraping/](data_scraping/).
2. n8n workflows are executed to generate or transform lesson content.
3. Outputs are written into JSON files stored in the generated data folders.

### Generation steps

Workflow JSON files in [workflows/](workflows/) define how lesson content is assembled. These flows typically ingest JSON input, apply LLM-based generation steps, and output MCQ-formatted lesson artifacts.

### Output usage

The backend loads the generated JSON and exposes it through API endpoints. The frontend consumes these endpoints for lesson browsing and tutoring support.

## Repository Structure

### Folder tree

```
.
├── AIGeneratedData_json/
├── AIGeneratedData_n8n/
├── AI_Synthethic_data/
├── NEW_AIGeneratedData_json/
├── NEW_AIGeneratedData_n8n/
├── backend/
├── data_scraping/
├── db/
├── frontend/
├── images/
├── ogData/
├── scripts/
├── workflows/
├── data_organization.ipynb
├── working.ipynb
└── README.md
```

### Major directories

- [backend/](backend/) — FastAPI backend, lesson loader, tutor chat logic.
- [frontend/](frontend/) — Next.js UI, lesson views, tutor chat widget.
- [workflows/](workflows/) — n8n workflow exports.
- [data_scraping/](data_scraping/) — data collection and preprocessing tools.
- [AIGeneratedData_json/](AIGeneratedData_json/) and [NEW_AIGeneratedData_json/](NEW_AIGeneratedData_json/) — generated lesson/question datasets.
- [db/](db/) — database helpers and ingestion scripts.

## Workflow or Backend System Explanation

### Purpose

The backend exists to expose lesson data and tutor functionality. It is the primary interface between generated datasets and the frontend UI.

### Execution process

We run the backend with this flow:

1. The backend loads lesson JSON on startup.
2. Topic contexts are precomputed and cached.
3. API endpoints serve lessons and questions by ID.
4. Chat requests pass through a tutor prompt that restricts answers to the provided lesson context and avoids answer leakage.

### Outputs

- Lesson lists and details returned as JSON
- MCQ details for a given question ID
- Tutor chat responses scoped to lesson or topic context

## Frontend Application Explanation

### Purpose

The frontend provides the learner-facing experience, including lesson navigation, quizzes, and a tutor chat widget connected to the backend.

### Main components

- Lesson views under [frontend/app/lessons/](frontend/app/lessons/)
- Tutor chat widget in [frontend/app/components/TutorChatWidget.tsx](frontend/app/components/TutorChatWidget.tsx)
- Quiz UI components in [frontend/app/components/](frontend/app/components/)

### Current capabilities

- Browse and render lesson content
- Interact with a tutor chat widget that calls the backend
- Display MCQ-style quiz content

## Setup and Running the System

### Quick start

We run the full system by starting the backend and frontend in separate terminals.

```bash
cd backend
python main.py
```

```bash
cd frontend
npm run dev
```

### Backend setup

We keep backend environment variables, dependencies, and API details in [backend/README.md](backend/README.md).

### Frontend setup

We document frontend dependency installation and environment configuration in [frontend/README.md](frontend/README.md).

### Workflow setup

The workflow layer uses exported n8n JSON files. Setup and execution steps vary by workflow and are documented alongside each workflow file.

## Development Workflow

We typically work with a simple loop:

1. We start by identifying whether changes affect workflows, backend, or frontend.
2. We update datasets or pipeline scripts before changing API contracts to keep interfaces stable.
3. We keep changes isolated to the relevant folder and update that folder README when behavior changes.
4. We validate that frontend requests still match backend API responses.

## Roadmap

We plan to:

- formalize dataset versioning and ownership
- standardize workflow execution and parameterization
- expand lesson coverage beyond level 1
- improve documentation for database usage and migrations

## Troubleshooting Guide

When something goes wrong, we check these common points:

- If the backend fails to start, we verify that `OPENAI_API_KEY` is set and the lesson JSON path exists.
- If the frontend cannot reach the backend, we set `NEXT_PUBLIC_BACKEND_URL` and ensure the backend is running.
- If lesson data is missing, we update `LESSONS_DATA_PATH` or replace the default dataset file.
