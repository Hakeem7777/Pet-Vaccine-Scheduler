import os
import shutil
from typing import List, Any  # <--- Added 'Any' here
import streamlit as st

DATA_DIR = "data"

def save_uploaded_files(uploaded_files: List[Any]) -> List[str]:
    """
    Saves Streamlit uploaded files to the local data directory.
    Returns a list of file paths.
    """
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        
    saved_paths = []
    for uploaded_file in uploaded_files:
        file_path = os.path.join(DATA_DIR, uploaded_file.name)
        with open(file_path, "wb") as f:
            f.write(uploaded_file.getbuffer())
        saved_paths.append(file_path)
    
    return saved_paths

def clear_data_directory():
    """Cleans up the data directory."""
    if os.path.exists(DATA_DIR):
        shutil.rmtree(DATA_DIR)
        os.makedirs(DATA_DIR)