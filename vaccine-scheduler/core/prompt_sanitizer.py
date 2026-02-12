"""
Sanitization for user inputs before interpolation into LLM prompts.
Mitigates prompt injection attacks.
"""
import re
import unicodedata


# Patterns that indicate prompt injection attempts
INJECTION_PATTERNS = [
    # Direct instruction override
    r'(?i)ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|context|prompts?)',
    r'(?i)disregard\s+(all\s+)?(previous|above|prior)',
    r'(?i)forget\s+(everything|all|your)',
    r'(?i)override\s+(your|all|the)',
    r'(?i)bypass\s+(your|all|the)',
    # Role reassignment
    r'(?i)you\s+are\s+now\s+',
    r'(?i)pretend\s+(you|to\s+be)',
    r'(?i)act\s+as\s+(if|a|an)',
    r'(?i)role[\s\-]*play',
    # New instruction injection
    r'(?i)new\s+instructions?:',
    r'(?i)IMPORTANT:\s*(ignore|forget|disregard)',
    r'(?i)BEGIN\s+(NEW\s+)?(INSTRUCTION|PROMPT|SYSTEM)',
    # Model-specific delimiters
    r'(?i)system\s*:',
    r'(?i)\[INST\]',
    r'(?i)<\|im_start\|>',
    r'(?i)<\|?(system|assistant|user)\|?>',
    r'(?i)<<\s*SYS\s*>>',
    # Template injection
    r'(?i)\{\{.*?(system|prompt|inject)',
]


def sanitize_prompt_input(text: str, max_length: int = 500) -> str:
    """
    Sanitize user input before interpolation into LLM prompts.

    - Strips invisible/control characters (zero-width, format chars)
    - Truncates to max_length
    - Filters known prompt injection patterns
    """
    if not text:
        return ''

    # Strip zero-width and format characters (Unicode category 'Cf')
    text = ''.join(c for c in text if unicodedata.category(c) != 'Cf')

    # Filter injection patterns BEFORE truncation to prevent padding attacks
    for pattern in INJECTION_PATTERNS:
        text = re.sub(pattern, '[filtered]', text)

    text = text[:max_length]

    return text.strip()
