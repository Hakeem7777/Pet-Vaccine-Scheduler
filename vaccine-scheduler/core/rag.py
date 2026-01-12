import logging
from typing import Any
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.vectorstores import FAISS

from core.config import RETRIEVER_K
from core.llm_providers import get_llm

logger = logging.getLogger(__name__)


class RAGPipeline:
    """
    Manages the RAG pipeline using LangChain with configurable LLM provider.
    """
    def __init__(self, vectorstore: FAISS):
        logger.info("[RAGPipeline.__init__] Creating LLM via get_llm()...")
        self.llm = get_llm()
        logger.info(f"[RAGPipeline.__init__] LLM created: {type(self.llm).__name__}")
        if hasattr(self.llm, 'model_name'):
            logger.info(f"[RAGPipeline.__init__] Model name: {self.llm.model_name}")
        self.vectorstore = vectorstore
        self.retriever = self.vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": RETRIEVER_K})

    def get_chain(self) -> Any:
        """
        Constructs and returns the RAG execution chain.
        """
        system_prompt = (
            "You are an assistant for question-answering tasks. "
            "Use the following pieces of retrieved context to answer "
            "the question. If you don't know the answer, say that you "
            "don't know. Use three sentences maximum and keep the "
            "answer concise."
            "\n\n"
            "{context}"
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}"),
        ])

        question_answer_chain = create_stuff_documents_chain(self.llm, prompt)
        rag_chain = create_retrieval_chain(self.retriever, question_answer_chain)
        
        return rag_chain

    def answer_query(self, query: str):
        """
        Executes the chain and returns the answer with source documents.
        """
        logger.info(f"[RAGPipeline.answer_query] Starting query, LLM type: {type(self.llm).__name__}")
        if hasattr(self.llm, 'model_name'):
            logger.info(f"[RAGPipeline.answer_query] Model: {self.llm.model_name}")

        chain = self.get_chain()

        logger.info("[RAGPipeline.answer_query] Invoking chain...")
        try:
            response = chain.invoke({"input": query})
            logger.info("[RAGPipeline.answer_query] Chain invocation successful")
            return {
                "answer": response["answer"],
                "sources": response["context"]
            }
        except Exception as e:
            logger.error(f"[RAGPipeline.answer_query] Chain invocation failed: {e}", exc_info=True)
            raise