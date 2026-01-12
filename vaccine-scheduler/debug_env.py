import sys
import os

print(f"Python Executable: {sys.executable}")
try:
    import langchain
    print(f"LangChain Location: {os.path.dirname(langchain.__file__)}")
    print(f"LangChain Version: {langchain.__version__}")
    
    from langchain import chains
    print("Success: langchain.chains found!")
except ImportError as e:
    print(f"Error: {e}")