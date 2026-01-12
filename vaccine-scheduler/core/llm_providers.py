"""
LLM Provider Factory for multi-provider support.

Supports Gemini and OpenAI with runtime configuration via environment variables.
"""
import logging
import os
from typing import Optional

from langchain_core.language_models.chat_models import BaseChatModel

from core.config import (
    LLM_PROVIDER,
    LLM_MODEL,
    LLM_TEMPERATURE,
    DEFAULT_CHAT_MODELS,
    DEFAULT_VISION_MODELS
)

logger = logging.getLogger(__name__)

# Debug: Log configuration at module load
logger.info(f"[LLM_PROVIDERS] Module loaded - LLM_PROVIDER={LLM_PROVIDER}, LLM_MODEL={LLM_MODEL or '(default)'}")


class LLMProviderFactory:
    """Factory for creating LLM instances based on configuration."""

    @staticmethod
    def _model_matches_provider(model: str, provider: str) -> bool:
        """Check if a model name is compatible with the given provider."""
        model_lower = model.lower()
        if provider == "openai":
            # OpenAI models typically start with gpt-, o1-, chatgpt-, etc.
            return any(model_lower.startswith(prefix) for prefix in ["gpt-", "o1-", "chatgpt-", "o3-"])
        elif provider == "gemini":
            # Gemini models start with gemini-
            return model_lower.startswith("gemini")
        return False

    @staticmethod
    def get_chat_llm(
        provider: Optional[str] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        **kwargs
    ) -> BaseChatModel:
        """
        Get a chat LLM instance.

        Args:
            provider: "gemini" or "openai". Defaults to LLM_PROVIDER env var.
            model: Model name. Defaults to LLM_MODEL or provider default.
            temperature: Model temperature. Defaults to LLM_TEMPERATURE.
            **kwargs: Additional model-specific parameters.

        Returns:
            Configured LLM instance.
        """
        provider = provider or LLM_PROVIDER
        temperature = temperature if temperature is not None else LLM_TEMPERATURE

        # Only use LLM_MODEL if it matches the provider, otherwise use provider default
        if model:
            resolved_model = model
        elif LLM_MODEL and LLMProviderFactory._model_matches_provider(LLM_MODEL, provider):
            resolved_model = LLM_MODEL
        else:
            resolved_model = DEFAULT_CHAT_MODELS.get(provider)

        logger.info(f"[get_chat_llm] provider={provider}, model={resolved_model}, temperature={temperature}")
        logger.info(f"[get_chat_llm] LLM_MODEL env={LLM_MODEL or '(not set)'}, using={resolved_model}")

        if provider == "openai":
            return LLMProviderFactory._create_openai_llm(resolved_model, temperature, **kwargs)
        else:
            return LLMProviderFactory._create_gemini_llm(resolved_model, temperature, **kwargs)

    @staticmethod
    def get_vision_llm(
        provider: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.1,
        **kwargs
    ) -> BaseChatModel:
        """
        Get a vision-capable LLM instance for document extraction.

        Args:
            provider: "gemini" or "openai". Defaults to LLM_PROVIDER env var.
            model: Model name. Defaults to provider's vision model.
            temperature: Model temperature. Defaults to 0.1 for precision.
            **kwargs: Additional model-specific parameters.

        Returns:
            Vision-capable LLM instance.
        """
        provider = provider or LLM_PROVIDER
        model = model or DEFAULT_VISION_MODELS.get(provider)

        if provider == "openai":
            return LLMProviderFactory._create_openai_llm(model, temperature, **kwargs)
        else:
            return LLMProviderFactory._create_gemini_llm(model, temperature, **kwargs)

    @staticmethod
    def _create_gemini_llm(
        model: Optional[str],
        temperature: float,
        **kwargs
    ) -> BaseChatModel:
        """Create Gemini LLM instance."""
        from langchain_google_genai import ChatGoogleGenerativeAI

        model = model or DEFAULT_CHAT_MODELS["gemini"]
        logger.info(f"Creating Gemini LLM: {model}")

        return ChatGoogleGenerativeAI(
            model=model,
            temperature=temperature,
            convert_system_message_to_human=kwargs.pop('convert_system_message_to_human', True),
            **kwargs
        )

    @staticmethod
    def _create_openai_llm(
        model: Optional[str],
        temperature: float,
        **kwargs
    ) -> BaseChatModel:
        """Create OpenAI LLM instance."""
        from langchain_openai import ChatOpenAI

        model = model or DEFAULT_CHAT_MODELS["openai"]
        api_key = os.getenv("OPENAI_API_KEY")

        logger.info(f"[_create_openai_llm] Creating OpenAI LLM: model={model}, temp={temperature}")
        logger.info(f"[_create_openai_llm] API key present: {bool(api_key)}, key prefix: {api_key[:10] if api_key else 'None'}...")

        return ChatOpenAI(
            model=model,
            temperature=temperature,
            **kwargs
        )


def get_llm(**kwargs) -> BaseChatModel:
    """Shortcut to get the default configured chat LLM."""
    return LLMProviderFactory.get_chat_llm(**kwargs)


def get_vision_llm(**kwargs) -> BaseChatModel:
    """Shortcut to get the default vision LLM."""
    return LLMProviderFactory.get_vision_llm(**kwargs)
