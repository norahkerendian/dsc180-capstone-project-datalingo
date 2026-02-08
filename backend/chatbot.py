"""backend.chatbot

Thin wrapper around the OpenAI Python SDK.

Responsibilities:
- Load environment variables (via `python-dotenv`)
- Validate the presence of `OPENAI_API_KEY`
- Build OpenAI Chat Completions `messages` with an instructional system prompt
- Execute the API call and return assistant text

This file intentionally does *not* know about lessons/question IDs; it only
accepts an already-formatted `lesson_context` string.

Conversation history format:
- A list of messages in the OpenAI schema: `{"role": ..., "content": ...}`
- Roles are typically `user` and `assistant` (we always add the `system` message)
"""

import os
from typing import Optional
from pathlib import Path
import hashlib
from typing import Any

from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables.
#
# When running `python backend/main.py` from the repo root, the current working
# directory is *not* `backend/`, so a `backend/.env` file would be missed by a
# plain `load_dotenv()` call. We load both:
# - default search (cwd + parents)
# - explicit `backend/.env`
load_dotenv()
load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=False)


def _extract_assistant_text(message) -> str:
    """Extract a usable assistant text string from an OpenAI chat message.

    The OpenAI SDK may return:
    - `message.content` as a string (common)
    - `message.content` as None (e.g., refusals or tool calls)
    - `message.content` as a structured list for some models/SDK versions

    This helper ensures we always return a plain string so the API response
    matches `ChatResponse.response: str`.
    """

    content = getattr(message, "content", None)

    if isinstance(content, str):
        return content

    # Some SDK/model combinations may return rich content parts.
    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict):
                # Common patterns: {"type": "text", "text": "..."}
                text = part.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "".join(parts).strip()

    # If the model refused, newer SDKs may expose a refusal field.
    refusal = getattr(message, "refusal", None)
    if isinstance(refusal, str) and refusal.strip():
        return refusal.strip()

    # If tool calls were returned, this backend currently does not execute them.
    tool_calls = getattr(message, "tool_calls", None)
    if tool_calls:
        return (
            "The assistant returned a tool-call response, but this backend "
            "does not execute tools. Please rephrase your question."
        )

    # Last resort: avoid returning None.
    return ""


def get_openai_client() -> OpenAI:
    """Create a configured OpenAI client.

    Raises:
        ValueError: if `OPENAI_API_KEY` is missing or looks like a placeholder.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key.startswith("sk-your"):
        raise ValueError(
            "OPENAI_API_KEY not configured. "
            "Copy .env.example to .env and add your API key."
        )
    return OpenAI(api_key=api_key)


def get_model() -> str:
    """Return the configured model name.

    Defaults to a small/fast model if `OPENAI_MODEL` is not set.
    """
    return os.getenv("OPENAI_MODEL", "gpt-5-mini")


def _topic_prompt_cache_key(topic_key: str) -> str:
    """Generate a short, stable prompt cache key for a topic.

    The OpenAI Responses API supports server-side prompt caching keyed by a
    string. We hash to keep keys short and safe.
    """

    digest = hashlib.sha1(topic_key.encode("utf-8")).hexdigest()[:24]
    return f"topic_ctx_{digest}"


# System prompt for the chatbot
SYSTEM_PROMPT = """You are a Data Science tutor assistant. Your goal is to help students understand concepts from their coursework and guide them to answers without solving questions for them.

Source rules (strict):
- Use ONLY the lesson or topic content provided in the conversation.
- Do not use outside knowledge.
- If the question cannot be answered using the provided content, say:
  "I don't know based on the current lesson context."

Quiz and answer restrictions:
- Never provide the answer to quizzes or MCQs.
- Never reveal, guess, or imply which option is correct.
- Never restate the correct option as an answer.
- Do not eliminate options in a way that reveals the answer.

Tutoring behavior:
- Provide concise hints, definitions, or reasoning steps.
- Help students think through the problem rather than solving it.
- Ask a short guiding question if the student seems stuck.
- Keep explanations short and directly related to the lesson topic.

Scope control:
- Avoid unrelated analogies or off-topic examples unless they appear in the lesson content.
- Avoid chit-chat or filler content.
- Stay focused on learning goals.

Missing context handling:
- If no lesson/topic content is provided, say:
  "Please provide the current lesson or topic so I can help."

Tone and style:
- Be clear, supportive, and concise.
- Prioritize clarity over length.
"""

# Used to invalidate existing topic sessions when prompt rules change.
PROMPT_VERSION = hashlib.sha1(SYSTEM_PROMPT.encode("utf-8")).hexdigest()[:12]


def chat_with_context(
    user_message: str,
    lesson_context: Optional[str] = None,
    conversation_history: Optional[list[dict]] = None,
) -> str:
    """
    Send a message to the chatbot with optional lesson context.
    
    Args:
        user_message: The user's question or message
        lesson_context: Formatted lesson content to use as context
        conversation_history: Previous messages for multi-turn conversation.
            Must be a list of dicts like:
            `[{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]`
            This function appends the current user message after the history.
    
    Returns:
        The assistant's response text
    """
    client = get_openai_client()
    model = get_model()
    
    messages = []
    
    # Build system prompt with lesson context
    # System prompt sets the tutor behavior and constrains answers.
    # If lesson_context is present, we append it verbatim.
    system_content = SYSTEM_PROMPT
    if lesson_context:
        system_content += f"\n\n--- LESSON CONTENT ---\n{lesson_context}\n--- END LESSON CONTENT ---"
    
    messages.append({"role": "system", "content": system_content})
    
    # Add conversation history if provided
    # Add conversation history if provided (multi-turn chat).
    # NOTE: We expect the frontend to only include user/assistant messages.
    if conversation_history:
        messages.extend(conversation_history)
    
    # Add the current user message
    messages.append({"role": "user", "content": user_message})
    
    # Call OpenAI API
    # Call OpenAI API.
    # `max_tokens` caps the assistant response length; context length is driven
    # by `lesson_context` size.
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.2,
        # max_completion_tokens=500,
    )

    # Defensive extraction: avoid IndexError/None content causing 500s.
    if not getattr(response, "choices", None):
        raise ValueError("OpenAI returned no choices in the response.")

    return _extract_assistant_text(response.choices[0].message)


def _extract_usage(response: Any) -> dict[str, Optional[int]]:
    """Best-effort usage extraction across OpenAI APIs.

    Chat Completions typically returns usage with:
    - prompt_tokens / completion_tokens / total_tokens

    Responses API typically returns usage with:
    - input_tokens / output_tokens / total_tokens
    """

    usage = getattr(response, "usage", None)
    if not usage:
        return {
            "input_tokens": None,
            "output_tokens": None,
            "total_tokens": None,
        }

    # Responses API style
    input_tokens = getattr(usage, "input_tokens", None)
    output_tokens = getattr(usage, "output_tokens", None)
    total_tokens = getattr(usage, "total_tokens", None)

    # Chat Completions style
    prompt_tokens = getattr(usage, "prompt_tokens", None)
    completion_tokens = getattr(usage, "completion_tokens", None)

    def _int_or_none(x):
        return int(x) if isinstance(x, int) else None

    if input_tokens is None and prompt_tokens is not None:
        input_tokens = prompt_tokens
    if output_tokens is None and completion_tokens is not None:
        output_tokens = completion_tokens

    return {
        "input_tokens": _int_or_none(input_tokens),
        "output_tokens": _int_or_none(output_tokens),
        "total_tokens": _int_or_none(total_tokens),
    }


def chat_with_context_with_usage(
    user_message: str,
    lesson_context: Optional[str] = None,
    conversation_history: Optional[list[dict]] = None,
) -> tuple[str, dict[str, Optional[int]]]:
    """Like chat_with_context, but also returns a usage dict."""

    client = get_openai_client()
    model = get_model()

    messages = []
    system_content = SYSTEM_PROMPT
    if lesson_context:
        system_content += f"\n\n--- LESSON CONTENT ---\n{lesson_context}\n--- END LESSON CONTENT ---"
    messages.append({"role": "system", "content": system_content})
    if conversation_history:
        messages.extend(conversation_history)
    messages.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.2,
    )

    if not getattr(response, "choices", None):
        raise ValueError("OpenAI returned no choices in the response.")

    return _extract_assistant_text(response.choices[0].message), _extract_usage(response)


def start_topic_session(*, topic_context: str, topic_key: str) -> str:
    """Initialize a stateful topic session and return the first response id.

    We use the Responses API so we can continue the conversation using
    `previous_response_id` without re-sending the full topic context.

    Note: This performs a minimal "bootstrap" call to obtain a response id.
    """

    client = get_openai_client()
    model = get_model()

    instructions = SYSTEM_PROMPT
    instructions += (
        "\n\n--- TOPIC CONTENT ---\n"
        f"{topic_context}\n"
        "--- END TOPIC CONTENT ---"
    )

    # Minimal input to create the initial server-side conversation state.
    response = client.responses.create(
        model=model,
        instructions=instructions,
        input="Session initialized.",
        store=True,
        prompt_cache_key=_topic_prompt_cache_key(topic_key),
    )

    return response.id


def chat_with_topic_session(
    *,
    previous_response_id: str,
    user_message: str,
) -> tuple[str, str, dict[str, Optional[int]]]:
    """Continue a topic session using the Responses API.

    Returns:
        (assistant_text, new_previous_response_id)
    """

    client = get_openai_client()
    model = get_model()

    response = client.responses.create(
        model=model,
        previous_response_id=previous_response_id,
        input=user_message,
        store=True,
    )

    assistant_text = getattr(response, "output_text", "") or ""
    return assistant_text, response.id, _extract_usage(response)


def estimate_tokens(text: str) -> int:
    """
    Rough estimate of token count for a text string.
    Uses the ~4 chars per token approximation.
    """
    return len(text) // 4
