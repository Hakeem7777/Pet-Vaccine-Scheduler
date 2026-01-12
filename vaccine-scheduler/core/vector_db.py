# Original relative path: core/vector_db.py

# Embeddings and Vector Store logic
import os
import logging
from typing import List, Any
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from core.config import EMBEDDING_MODEL

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VectorDBManager:
    """
    Manages the creation and retrieval of the Vector Database.
    """
    def __init__(self):
        logger.info(f"Initializing OpenAI embeddings with model: {EMBEDDING_MODEL}")
        self.embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL)

    def load_documents(self, file_paths: List[str]) -> List[Document]:
        """Loads documents from the specified file paths."""
        docs = []
        for path in file_paths:
            try:
                if path.endswith(".pdf"):
                    loader = PyPDFLoader(path)
                elif path.endswith(".txt"):
                    loader = TextLoader(path)
                else:
                    logger.warning(f"Unsupported file format: {path}")
                    continue
                docs.extend(loader.load())
            except Exception as e:
                logger.error(f"Error loading {path}: {e}")
        return docs

    def create_vector_store(self, docs: List[Document]) -> FAISS:
        """
        Splits documents and creates a FAISS vector store.
        """
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        splits = text_splitter.split_documents(docs)
        
        if not splits:
            raise ValueError("No content parsed from documents.")

        logger.info(f"Creating vector store with {len(splits)} chunks.")
        vectorstore = FAISS.from_documents(documents=splits, embedding=self.embeddings)
        return vectorstore