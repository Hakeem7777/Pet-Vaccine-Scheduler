"""
Service layer for RAG-powered AI analysis.
Wraps core.rag.RAGPipeline for Django integration.
"""
import logging
import os
from typing import Any, Dict, Optional

from django.conf import settings

logger = logging.getLogger(__name__)


class RAGService:
    """
    Singleton service managing the RAG pipeline.
    Initialized once at Django startup to avoid repeated expensive operations.
    """
    _instance: Optional['RAGService'] = None
    _pipeline: Optional[Any] = None
    _db_manager: Optional[Any] = None
    _initialized: bool = False
    _initialization_error: Optional[str] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def initialize(self) -> bool:
        """
        Initialize the RAG pipeline.
        Should be called once at Django startup.

        Returns:
            True if successful, False otherwise.
        """
        if self._initialized:
            logger.info("[RAGService.initialize] Already initialized, skipping")
            return True

        if self._initialization_error:
            logger.warning(f"Previous initialization failed: {self._initialization_error}")

        logger.info("[RAGService.initialize] Starting RAG pipeline initialization...")

        try:
            from core.vector_db import VectorDBManager
            from core.rag import RAGPipeline
            from core.config import LLM_PROVIDER, LLM_MODEL

            logger.info(f"[RAGService.initialize] Config: LLM_PROVIDER={LLM_PROVIDER}, LLM_MODEL={LLM_MODEL or '(default)'}")

            self._db_manager = VectorDBManager()

            # Get context directory
            context_dir = getattr(settings, 'LLM_CONTEXT_DIR', None)
            if context_dir is None:
                context_dir = settings.BASE_DIR / 'llm_context'

            context_dir = str(context_dir)

            if not os.path.exists(context_dir):
                logger.warning(f"Context directory does not exist: {context_dir}")
                self._initialization_error = f"Context directory not found: {context_dir}"
                return False

            # Find documents
            files = []
            for f in os.listdir(context_dir):
                if f.endswith(('.pdf', '.txt')):
                    files.append(os.path.join(context_dir, f))

            if not files:
                logger.warning(f"No documents found in: {context_dir}")
                self._initialization_error = "No PDF or TXT documents found"
                return False

            logger.info(f"Loading {len(files)} documents from {context_dir}")

            # Load documents and create vector store
            docs = self._db_manager.load_documents(files)
            if not docs:
                self._initialization_error = "Failed to load documents"
                return False

            vectorstore = self._db_manager.create_vector_store(docs)

            logger.info("[RAGService.initialize] Creating RAGPipeline (this will create the LLM)...")
            self._pipeline = RAGPipeline(vectorstore)

            self._initialized = True
            self._initialization_error = None
            logger.info(f"[RAGService.initialize] RAG pipeline initialized successfully with LLM: {type(self._pipeline.llm).__name__}")
            return True

        except Exception as e:
            logger.error(f"Failed to initialize RAG pipeline: {e}", exc_info=True)
            self._initialization_error = str(e)
            return False

    def is_available(self) -> bool:
        """Check if RAG pipeline is ready for queries."""
        return self._initialized and self._pipeline is not None

    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the RAG service."""
        return {
            'initialized': self._initialized,
            'available': self.is_available(),
            'error': self._initialization_error,
        }

    def query(self, query: str) -> Dict[str, Any]:
        """
        Execute a RAG query.

        Args:
            query: The question to answer.

        Returns:
            Dict with 'answer' and 'sources' keys.

        Raises:
            RuntimeError: If pipeline not initialized.
        """
        if not self.is_available():
            raise RuntimeError(
                f"RAG pipeline not available. Status: {self.get_status()}"
            )

        logger.info(f"[RAGService.query] Executing query with LLM: {type(self._pipeline.llm).__name__}")
        logger.info(f"[RAGService.query] LLM details: {self._pipeline.llm}")

        result = self._pipeline.answer_query(query)

        # Format sources for API response
        sources = []
        for doc in result.get('sources', []):
            source_path = doc.metadata.get('source', 'Unknown')
            # Extract just the filename
            source_name = os.path.basename(source_path) if source_path else 'Unknown'
            sources.append({
                'document': source_name,
                'excerpt': doc.page_content[:500] + ('...' if len(doc.page_content) > 500 else ''),
            })

        return {
            'answer': result['answer'],
            'sources': sources,
            'token_usage': result.get('token_usage', {}),
        }


# Global singleton instance
rag_service = RAGService()
