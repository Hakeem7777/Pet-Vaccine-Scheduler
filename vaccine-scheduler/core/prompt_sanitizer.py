"""
Sanitization for user inputs before interpolation into LLM prompts.
Mitigates prompt injection attacks.
"""
import re


def sanitize_prompt_input(text: str, max_length: int = 500) -> str:
    """
    Sanitize user input before interpolation into LLM prompts.

    - Truncates to max_length
    - Strips common prompt injection patterns
    """
    if not text:
        return ''

    text = text[:max_length]

    injection_patterns = [
        r'(?i)ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|context|prompts?)',
        r'(?i)disregard\s+(all\s+)?(previous|above|prior)',
        r'(?i)you\s+are\s+now\s+',
        r'(?i)new\s+instructions?:',
        r'(?i)system\s*:',
        r'(?i)\[INST\]',
        r'(?i)<\|im_start\|>',
    ]

    for pattern in injection_patterns:
        text = re.sub(pattern, '[filtered]', text)

    return text.strip()
