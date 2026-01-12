# Engineering Standards & Contribution Rules

**Authority:** This document is the source of truth for code quality. PRs violating these rules will be automatically rejected.

## 1. Core Principles
1.  **Functional Purity:**
    *   **Time:** Never call `datetime.now()` or `datetime.today()` inside core business logic functions. Pass the date as an argument (dependency injection). This ensures testability.
    *   **Randomness:** Seed all random number generators.
2.  **No Silent Failures:**
    *   **Forbidden:** `try: ... except: pass` is strictly prohibited.
    *   **Requirement:** All exceptions must be logged with a stack trace or raised to the caller.
3.  **Configuration:**
    *   **No Magic Strings:** Do not hardcode file paths, model names (`gemini-2.5`), or API keys in the code. Use `core/config.py` or environment variables.

## 2. Testing Standards
1.  **Zero Logic without Tests:**
    *   Any modification to `scheduler.py` or `calculator` logic MUST include a corresponding unit test in `tests/`.
2.  **Mock External Services:**
    *   Tests must not make real API calls to Google/OpenAI or write to the actual filesystem. Use `unittest.mock`.

## 3. Performance & Efficiency
1.  **Vector DB Management:**
    *   Never re-embed the entire dataset upon application startup.
    *   Implement incremental indexing: Check hash/filename $\rightarrow$ Process only new $\rightarrow$ Persist index to disk.
2.  **Loop Hygiene:**
    *   Do not perform I/O operations (file reads, DB queries) inside loops. Batch them.

## 4. Code Style & Structure
1.  **Type Hinting:**
    *   All function signatures must have Python type hints.
    *   *Bad:* `def process(data):`
    *   *Good:* `def process(data: Dict[str, Any]) -> List[ScheduleItem]:`
2.  **Docstrings:**
    *   Public functions must have docstrings explaining **Arguments**, **Returns**, and **Exceptions Raised**.
3.  **Imports:**
    *   Use absolute imports (`from core.scheduler import ...`) over relative imports (`from ..core import ...`) to prevent path resolution errors during migration.

## 5. Security
1.  **Input Validation:**
    *   Never trust user input (files or text). Validate file extensions and sanitize string inputs before processing.
2.  **Secrets:**
    *   `.env` files must be in `.gitignore`.
    *   API Keys must never be committed, even in comments.

## 6. AI/LLM Specifics
1.  **Deterministic Fallbacks:**
    *   Medical/Safety logic must be Rule-Based, not LLM-based. The LLM explains the schedule; it does not *create* the schedule.
2.  **Prompt Engineering:**
    *   Prompts should be stored in separate text/template files or a config dictionary, not hardcoded inside Python functions.

---
**Verdict:** If it's not tested, it doesn't exist. If it crashes silently, it's a bug.