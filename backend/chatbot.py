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
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


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


# System prompt for the chatbot
SYSTEM_PROMPT = """You are a helpful Data Science tutor assistant. Your role is to help students understand concepts from their coursework.

Guidelines:
- Answer questions based ONLY on the provided lesson content
- Be concise but thorough in your explanations
- If asked something outside the lesson scope, politely explain that you can only help with the current lesson topic
- Use examples when helpful to clarify concepts
- Encourage the student and provide positive reinforcement
- If the student seems confused, try explaining the concept differently

If no lesson context is provided, let the student know you need more information about which lesson they're studying."""


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
        temperature=0.7,
        max_tokens=500,
    )

    # Defensive extraction: avoid IndexError/None content causing 500s.
    if not getattr(response, "choices", None):
        raise ValueError("OpenAI returned no choices in the response.")

    return _extract_assistant_text(response.choices[0].message)


def estimate_tokens(text: str) -> int:
    """
    Rough estimate of token count for a text string.
    Uses the ~4 chars per token approximation.
    """
    return len(text) // 4
