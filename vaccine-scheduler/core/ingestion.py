import os
import json
import logging
from typing import List, Set
from core.vector_db import VectorDBManager

# Constants
CONTEXT_DIR = "llm_context"
TRACKING_FILE = "data/processed_files.json"

logger = logging.getLogger(__name__)

def get_processed_files() -> Set[str]:
    if os.path.exists(TRACKING_FILE):
        with open(TRACKING_FILE, "r") as f:
            return set(json.load(f))
    return set()

def save_processed_files(files: Set[str]):
    if not os.path.exists("data"):
        os.makedirs("data")
    with open(TRACKING_FILE, "w") as f:
        json.dump(list(files), f)

def check_and_process_documents(db_manager: VectorDBManager):
    """
    Checks llm_context folder. If new files exist, indexes them.
    """
    if not os.path.exists(CONTEXT_DIR):
        os.makedirs(CONTEXT_DIR)
        return False

    current_files = {f for f in os.listdir(CONTEXT_DIR) if f.endswith(('.pdf', '.txt'))}
    processed_files = get_processed_files()
    
    new_files = current_files - processed_files
    
    if new_files:
        logger.info(f"Found {len(new_files)} new documents: {new_files}")
        
        # Full paths
        file_paths = [os.path.join(CONTEXT_DIR, f) for f in new_files]
        
        # Load and Index
        docs = db_manager.load_documents(file_paths)
        if docs:
            # Note: In a real prod app we might want to add_documents instead of overwriting
            # For this scope, we recreate to ensure consistency
            all_paths = [os.path.join(CONTEXT_DIR, f) for f in current_files]
            all_docs = db_manager.load_documents(all_paths)
            db_manager.create_vector_store(all_docs)
            
            # Update tracking
            save_processed_files(current_files)
            return True
    
    return False