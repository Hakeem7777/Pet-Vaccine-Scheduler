"""
LangChain callback handler for capturing token usage from chain invocations.
Used with RAG pipeline chains where direct response access is not available.
"""
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import LLMResult
from typing import Any


class TokenUsageCallbackHandler(BaseCallbackHandler):
    """Callback handler that captures token usage from LLM responses."""

    def __init__(self):
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.total_tokens = 0
        self.model_name = ''

    def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:
        """Capture token usage when LLM call completes."""
        if response.llm_output:
            # OpenAI format
            token_usage = response.llm_output.get('token_usage', {})
            if token_usage:
                self.total_input_tokens += token_usage.get('prompt_tokens', 0)
                self.total_output_tokens += token_usage.get('completion_tokens', 0)
                self.total_tokens += token_usage.get('total_tokens', 0)

            self.model_name = response.llm_output.get('model_name', self.model_name)

        # Check generations for Gemini-style metadata
        for gen_list in response.generations:
            for gen in gen_list:
                metadata = getattr(gen, 'generation_info', {}) or {}
                usage = metadata.get('usage_metadata', {})
                if usage:
                    self.total_input_tokens += (
                        usage.get('prompt_token_count', 0) or usage.get('input_tokens', 0)
                    )
                    self.total_output_tokens += (
                        usage.get('candidates_token_count', 0) or usage.get('output_tokens', 0)
                    )
                    self.total_tokens += (
                        usage.get('total_token_count', 0) or usage.get('total_tokens', 0)
                    )

    def get_usage(self) -> dict:
        total = self.total_tokens or (self.total_input_tokens + self.total_output_tokens)
        return {
            'input_tokens': self.total_input_tokens,
            'output_tokens': self.total_output_tokens,
            'total_tokens': total,
            'model_name': self.model_name,
        }
