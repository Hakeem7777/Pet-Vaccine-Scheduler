# Gemini RAG Application

A production-ready Retrieval-Augmented Generation (RAG) application using LangChain, Google Gemini, and Streamlit. This application allows users to upload documents (PDF/TXT), vectorizes them, and provides accurate answers based on the uploaded content with source citations.

## Features
- **Document Ingestion:** Supports PDF and TXT files.
- **Vector Storage:** Uses FAISS for efficient similarity search.
- **LLM Integration:** Google Gemini Pro via LangChain.
- **Source Citations:** Answers include references to the specific document and content chunk.
- **Modular Architecture:** Separation of UI, Business Logic, and Data.

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone <repo_url>
   cd gemini-rag-app