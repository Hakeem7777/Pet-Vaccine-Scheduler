import streamlit as st
from langchain_core.documents import Document
from typing import List

def render_header():
    """Renders the application header."""
    st.set_page_config(page_title="Gemini RAG", page_icon="🤖")
    st.title("RAG Assistant")
    st.markdown("Upload documents and ask questions with precise source citations.")

def render_chat_message(role: str, message: str):
    """Renders a chat message."""
    with st.chat_message(role):
        st.write(message)

def render_sources(sources: List[Document]):
    """Renders the sources in an expandable section."""
    with st.expander("📚 View Sources & Quotes"):
        for i, doc in enumerate(sources):
            source_name = doc.metadata.get("source", "Unknown").split("/")[-1]
            page_num = doc.metadata.get("page", "N/A")
            st.markdown(f"**Source {i+1}:** *{source_name} (Page {page_num})*")
            # FIX: Use st.markdown with ">" for blockquotes
            st.markdown(f"> {doc.page_content}")
