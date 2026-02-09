"""
Utility functions for tracking LLM token consumption.
Handles both Gemini and OpenAI response metadata formats.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def extract_token_usage(response) -> dict:
    """
    Extract token counts from a LangChain AIMessage response.
    Handles both Gemini and OpenAI response metadata formats.

    Returns dict with input_tokens, output_tokens, total_tokens, model_name.
    """
    metadata = getattr(response, 'response_metadata', {}) or {}
    result = {'input_tokens': 0, 'output_tokens': 0, 'total_tokens': 0, 'model_name': ''}

    # Try to get model name
    result['model_name'] = metadata.get('model_name', '') or metadata.get('model', '')

    # Gemini format: usage_metadata with prompt_token_count / candidates_token_count
    usage = metadata.get('usage_metadata', {})
    if usage:
        result['input_tokens'] = usage.get('prompt_token_count', 0) or usage.get('input_tokens', 0)
        result['output_tokens'] = usage.get('candidates_token_count', 0) or usage.get('output_tokens', 0)
        result['total_tokens'] = usage.get('total_token_count', 0) or usage.get('total_tokens', 0)
        if not result['total_tokens']:
            result['total_tokens'] = result['input_tokens'] + result['output_tokens']
        return result

    # OpenAI format: token_usage with prompt_tokens / completion_tokens
    usage = metadata.get('token_usage', {})
    if usage:
        result['input_tokens'] = usage.get('prompt_tokens', 0)
        result['output_tokens'] = usage.get('completion_tokens', 0)
        result['total_tokens'] = usage.get('total_tokens', 0)
        if not result['total_tokens']:
            result['total_tokens'] = result['input_tokens'] + result['output_tokens']
        return result

    return result


def log_token_usage(user, endpoint: str, usage_data) -> Optional['TokenUsage']:
    """
    Save token usage to database.

    Args:
        user: Django User instance
        endpoint: string identifier for the API endpoint
        usage_data: Either a LangChain AIMessage response object OR a dict with
                    {input_tokens, output_tokens, total_tokens, model_name}
    """
    try:
        from apps.dashboard.models import TokenUsage

        if isinstance(usage_data, dict):
            usage = usage_data
        else:
            usage = extract_token_usage(usage_data)

        total = usage.get('total_tokens', 0)
        if not total:
            total = usage.get('input_tokens', 0) + usage.get('output_tokens', 0)

        if total > 0:
            return TokenUsage.objects.create(
                user=user,
                endpoint=endpoint,
                model_name=usage.get('model_name', ''),
                input_tokens=usage.get('input_tokens', 0),
                output_tokens=usage.get('output_tokens', 0),
                total_tokens=total,
            )
        return None
    except Exception as e:
        logger.warning(f"Failed to log token usage for {endpoint}: {e}")
        return None
