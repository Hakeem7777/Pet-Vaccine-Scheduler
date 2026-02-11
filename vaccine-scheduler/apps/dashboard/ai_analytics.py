"""
AI Analytics engine for admin panel — LangChain ReAct Agent approach.

Uses GPT-4o-mini with a compact prompt for cost-efficient analytics.
Simple single-number questions bypass the agent entirely (single LLM call).
"""
import json
import logging
import re
from datetime import datetime, date
from typing import Optional

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Avg, Min, Max
from django.db.models.functions import TruncMonth, TruncWeek, TruncDay, TruncYear
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool

from apps.patients.models import Dog
from apps.vaccinations.models import Vaccine, VaccinationRecord
from apps.dashboard.models import (
    ContactSubmission, TokenUsage, ReminderPreference, ReminderLog,
)
from core.llm_providers import get_llm

logger = logging.getLogger(__name__)

User = get_user_model()

# ── Configuration ────────────────────────────────────────────────

ANALYTICS_MODEL = "gpt-4o-mini"   # Default model (can be overridden per request)
ANALYTICS_TEMPERATURE = 0.1
MAX_RESULTS = 500
MAX_TOOL_RESULT_ROWS = 30        # Max rows returned to LLM from tool
MAX_FIELD_VALUE_LENGTH = 40      # Truncate long string values in tool results
AGENT_RECURSION_LIMIT = 25         # Max langgraph recursion steps (~10 tool calls)

# Available models for the admin to choose from
AVAILABLE_MODELS = [
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "thinking": True},
    {"id": "gpt-4o", "name": "GPT-4o", "thinking": True},
    {"id": "gpt-4", "name": "GPT-4", "thinking": False},
    {"id": "o3-mini", "name": "O3 Mini", "thinking": True},
    {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash", "thinking": True},
    {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash", "thinking": False},
]

# ── Whitelists ────────────────────────────────────────────────────

MODEL_MAP = {
    'User': User,
    'Dog': Dog,
    'Vaccine': Vaccine,
    'VaccinationRecord': VaccinationRecord,
    'ContactSubmission': ContactSubmission,
    'TokenUsage': TokenUsage,
    'ReminderPreference': ReminderPreference,
    'ReminderLog': ReminderLog,
}

AGGREGATION_MAP = {
    'Count': Count, 'Sum': Sum, 'Avg': Avg, 'Min': Min, 'Max': Max,
}

TRUNC_MAP = {
    'TruncMonth': TruncMonth, 'TruncWeek': TruncWeek,
    'TruncDay': TruncDay, 'TruncYear': TruncYear,
}


# ── Helpers ───────────────────────────────────────────────────────

def _serialize_value(val):
    """Convert non-JSON-serializable values."""
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if hasattr(val, '__float__'):
        return float(val)
    return val


def _truncate_value(val, max_len=MAX_FIELD_VALUE_LENGTH):
    """Truncate long string values to save tokens."""
    if isinstance(val, str) and len(val) > max_len:
        return val[:max_len - 3] + '...'
    return val


def _compact_rows(rows: list, max_rows: int = MAX_TOOL_RESULT_ROWS) -> str:
    """Serialize rows compactly, truncating long values and limiting row count."""
    total = len(rows)
    truncated = total > max_rows
    sample = rows[:max_rows] if truncated else rows

    # Truncate string values within each row
    compact = []
    for row in sample:
        compact.append({k: _truncate_value(_serialize_value(v)) for k, v in row.items()})

    if truncated:
        return json.dumps({"total_rows": total, "rows": compact, "truncated": True}, default=str)
    return json.dumps(compact, default=str)


def _build_expression(spec: dict):
    """Build a Django aggregation/trunc expression from a spec dict."""
    func_name = spec.get('func')
    field = spec.get('field', 'id')
    distinct = spec.get('distinct', False)

    if func_name in AGGREGATION_MAP:
        agg_class = AGGREGATION_MAP[func_name]
        if func_name == 'Count':
            return agg_class(field, distinct=distinct)
        return agg_class(field)
    elif func_name in TRUNC_MAP:
        return TRUNC_MAP[func_name](field)
    else:
        raise ValueError(f"Unknown function: {func_name}")


def _execute_query(plan: dict) -> list | dict:
    """Execute a declarative query plan against the Django ORM (read-only)."""
    model_name = plan.get('model')
    if model_name not in MODEL_MAP:
        raise ValueError(
            f"Unknown model '{model_name}'. Choose from: {', '.join(MODEL_MAP)}"
        )

    model = MODEL_MAP[model_name]
    qs = model.objects.all()

    # 1. Pre-filters
    filters = plan.get('filters', {})
    if filters:
        qs = qs.filter(**filters)

    # 2. Trunc annotations
    trunc_specs = plan.get('trunc_annotations', {})
    if trunc_specs:
        trunc_kwargs = {
            alias: _build_expression(spec) for alias, spec in trunc_specs.items()
        }
        qs = qs.annotate(**trunc_kwargs)

    # 3. Aggregate (returns single dict)
    agg_specs = plan.get('aggregate')
    if agg_specs:
        ann_specs_for_agg = plan.get('annotations', {})
        if ann_specs_for_agg:
            ann_kwargs_for_agg = {
                alias: _build_expression(spec) for alias, spec in ann_specs_for_agg.items()
            }
            qs = qs.annotate(**ann_kwargs_for_agg)

        post_filters_for_agg = plan.get('post_filters', {})
        if post_filters_for_agg:
            qs = qs.filter(**post_filters_for_agg)

        agg_kwargs = {
            alias: _build_expression(spec) for alias, spec in agg_specs.items()
        }
        result = qs.aggregate(**agg_kwargs)
        return {k: _serialize_value(v) for k, v in result.items()}

    # 4. Annotations + values
    ann_specs = plan.get('annotations', {})
    ann_kwargs = {
        alias: _build_expression(spec) for alias, spec in ann_specs.items()
    } if ann_specs else {}

    values_fields = plan.get('values', [])
    post_filters = plan.get('post_filters', {})

    if post_filters and ann_kwargs:
        qs = qs.annotate(**ann_kwargs)
        qs = qs.filter(**post_filters)
        if values_fields:
            qs = qs.values(*values_fields)
    elif values_fields and ann_kwargs:
        qs = qs.values(*values_fields).annotate(**ann_kwargs)
    elif ann_kwargs:
        qs = qs.annotate(**ann_kwargs)
    elif values_fields:
        qs = qs.values(*values_fields)

    if plan.get('distinct'):
        qs = qs.distinct()

    order_by = plan.get('order_by', [])
    if order_by:
        qs = qs.order_by(*order_by)

    limit = min(plan.get('limit', MAX_RESULTS), MAX_RESULTS)

    if values_fields or ann_kwargs:
        rows = list(qs[:limit])
    else:
        rows = list(qs.values()[:limit])

    return [{k: _serialize_value(v) for k, v in row.items()} for row in rows]


# ── Agent Tools ───────────────────────────────────────────────────

@tool
def run_database_query(query_plan_json: str) -> str:
    """Run a Django ORM query. Input: JSON string.

    Keys: model (required), filters, trunc_annotations, annotations, post_filters, values, aggregate, order_by, limit, distinct.
    Models: User, Dog, Vaccine, VaccinationRecord, ContactSubmission, TokenUsage, ReminderPreference, ReminderLog.
    Funcs: Count, Sum, Avg, Min, Max, TruncMonth, TruncWeek, TruncDay, TruncYear.

    Order: filters → trunc_annotations → aggregate (returns dict) OR values+annotations (returns rows) → post_filters → order_by → limit.
    When both annotations and aggregate exist, annotations applied first.

    Examples:
    - Count users: {"model":"User","aggregate":{"total":{"func":"Count","field":"id"}}}
    - Top breeds: {"model":"Dog","values":["breed"],"annotations":{"count":{"func":"Count","field":"id"}},"order_by":["-count"],"limit":10}
    - Monthly trends: {"model":"VaccinationRecord","trunc_annotations":{"month":{"func":"TruncMonth","field":"date_administered"}},"values":["month"],"annotations":{"count":{"func":"Count","field":"id"}},"order_by":["month"]}
    - Avg dogs/user: {"model":"User","annotations":{"dog_count":{"func":"Count","field":"dogs"}},"aggregate":{"avg_dogs":{"func":"Avg","field":"dog_count"}}}
    """
    try:
        plan = json.loads(query_plan_json)
    except json.JSONDecodeError as e:
        return f"ERROR: Invalid JSON — {e}"

    try:
        result = _execute_query(plan)
        if isinstance(result, dict):
            return json.dumps({k: _serialize_value(v) for k, v in result.items()}, default=str)
        return _compact_rows(result)
    except Exception as e:
        return f"ERROR: {type(e).__name__}: {e}"


@tool
def get_model_fields(model_name: str) -> str:
    """Get field names and types for a model. Models: User, Dog, Vaccine, VaccinationRecord, ContactSubmission, TokenUsage, ReminderPreference, ReminderLog."""
    if model_name not in MODEL_MAP:
        return f"ERROR: Unknown model '{model_name}'. Choose from: {', '.join(MODEL_MAP)}"

    model = MODEL_MAP[model_name]
    fields = []
    for f in model._meta.get_fields():
        field_type = type(f).__name__
        name = f.name
        related = ''
        if hasattr(f, 'related_model') and f.related_model:
            related = f"→{f.related_model.__name__}"
        fields.append(f"{name}({field_type}){related}")

    return f"{model_name}: {', '.join(fields)}"


AGENT_TOOLS = [run_database_query, get_model_fields]

# ── System Prompts ────────────────────────────────────────────────

AGENT_SYSTEM_PROMPT = """You are a DB analytics assistant for a dog vaccination app. Query the database and return results with visualization config.

CRITICAL: You MUST finish within 3-4 tool calls. After gathering enough data, STOP calling tools and output your final JSON answer immediately. Do NOT keep querying — use what you have.

## Schema
- User: email, username, first_name, last_name, clinic_name, phone, is_staff, is_active, date_joined | rev: dogs, token_usages
- Dog: owner(FK→User,'dogs'), name, breed, sex, birth_date, weight_kg, env_indoor_only, env_dog_parks, env_daycare_boarding, env_travel_shows, env_tick_exposure | rev: vaccination_records
- Vaccine: vaccine_id, name, vaccine_type(core/core_conditional/noncore), min_start_age_weeks, is_active | rev: vaccination_records
- VaccinationRecord: dog(FK→Dog), vaccine(FK→Vaccine), date_administered, dose_number, notes, administered_by, created_at
- ContactSubmission: name, email, subject, message, is_read, created_at
- TokenUsage: user(FK→User,'token_usages'), endpoint, model_name, input_tokens, output_tokens, total_tokens, created_at
- ReminderPreference: user(O2O→User), reminders_enabled, lead_time_days, interval_hours, preferred_hour, preferred_timezone
- ReminderLog: user(FK→User), dog(FK→Dog), vaccine_id, dose_number, scheduled_date, sent_at

## Rules
1. Use EXACT numbers from tool results. Never guess.
2. Last query's data becomes the chart. For multi-part questions: gather stats first, run a final chart-friendly query last.
3. Use __ for relations: dog__owner__email, vaccine__name
4. For post-annotation filters use post_filters. For date grouping use trunc_annotations.
5. Limit: charts 10-20 items, tables 50 rows.
6. MAX 4 tool calls total. After that you MUST output the final JSON answer with whatever data you have.

## Final Answer
When done (or after 4 tool calls), output ONLY this JSON block — no extra text, no more tool calls:
```json
{"summary":"answer with numbers","visualization":"pie|bar|line|area|table|number","chart_config":{"title":"...","x_key":"...","y_key":"..."}}
```
Viz guide: number=single value, pie=categories(≤10), bar=comparisons, line/area=time series, table=row data."""


SIMPLE_QUERY_PROMPT = """You are a DB analytics assistant. Given the user's question and the query result, provide a concise answer.

Query result: {result}

Respond with ONLY this JSON (no other text):
{{"summary":"your answer with exact numbers from the result","visualization":"{viz_type}","chart_config":{{"title":"{title}","x_key":"{x_key}","y_key":"{y_key}"}}}}"""


# ── Simple query detection & fast path ────────────────────────────

# Patterns that can be answered with a single aggregate query
SIMPLE_PATTERNS = [
    # "how many users/dogs/etc"
    (r'\bhow many (users?|people|accounts?)\b', {
        'model': 'User', 'aggregate': {'total': {'func': 'Count', 'field': 'id'}}
    }, 'number', 'Total Users'),
    (r'\bhow many dogs?\b', {
        'model': 'Dog', 'aggregate': {'total': {'func': 'Count', 'field': 'id'}}
    }, 'number', 'Total Dogs'),
    (r'\bhow many vaccinations?\b', {
        'model': 'VaccinationRecord', 'aggregate': {'total': {'func': 'Count', 'field': 'id'}}
    }, 'number', 'Total Vaccinations'),
    (r'\bhow many vaccines?\b', {
        'model': 'Vaccine', 'aggregate': {'total': {'func': 'Count', 'field': 'id'}}
    }, 'number', 'Total Vaccines'),
    (r'\bhow many contacts?\b', {
        'model': 'ContactSubmission', 'aggregate': {'total': {'func': 'Count', 'field': 'id'}}
    }, 'number', 'Total Contact Submissions'),
    # "total tokens"
    (r'\btotal tokens?\b', {
        'model': 'TokenUsage', 'aggregate': {'total': {'func': 'Sum', 'field': 'total_tokens'}}
    }, 'number', 'Total Tokens Used'),
    # Top breeds
    (r'\btop \d*\s*(?:dog\s+)?breeds?\b', {
        'model': 'Dog', 'values': ['breed'],
        'annotations': {'count': {'func': 'Count', 'field': 'id'}},
        'order_by': ['-count'], 'limit': 10,
    }, 'pie', 'Top Dog Breeds'),
    # Vaccine type distribution
    (r'\b(distribution|breakdown).*(vaccine types?|types? of vaccines?)\b', {
        'model': 'Vaccine', 'values': ['vaccine_type'],
        'annotations': {'count': {'func': 'Count', 'field': 'id'}},
        'order_by': ['-count'],
    }, 'pie', 'Vaccine Type Distribution'),
    (r'\bvaccine types?\b.*\b(distribution|breakdown)\b', {
        'model': 'Vaccine', 'values': ['vaccine_type'],
        'annotations': {'count': {'func': 'Count', 'field': 'id'}},
        'order_by': ['-count'],
    }, 'pie', 'Vaccine Type Distribution'),
]


def _try_simple_query(user_message: str, model: str = None, provider: str = None) -> Optional[dict]:
    """
    Check if the message matches a simple pattern that can be answered
    with a single DB query + a lightweight LLM call (no agent loop).

    Returns the full response dict or None if not a simple query.
    """
    msg_lower = user_message.lower().strip()

    for pattern, query_plan, viz_type, title in SIMPLE_PATTERNS:
        if re.search(pattern, msg_lower):
            # Extract limit from message if present (e.g., "top 5 breeds")
            limit_match = re.search(r'\btop (\d+)', msg_lower)
            if limit_match and 'limit' in query_plan:
                query_plan = {**query_plan, 'limit': int(limit_match.group(1))}

            try:
                result = _execute_query(query_plan)
                logger.info(f"[Simple path] Matched pattern='{pattern}', result={str(result)[:200]}")
            except Exception as e:
                logger.warning(f"[Simple path] Query failed: {e}")
                return None

            # Determine chart keys
            if isinstance(result, list) and result:
                keys = list(result[0].keys())
                x_key = keys[0]
                y_key = keys[1] if len(keys) > 1 else keys[0]
            elif isinstance(result, dict):
                keys = list(result.keys())
                x_key = keys[0]
                y_key = keys[0]
            else:
                x_key = y_key = ''

            # Build summary with a single lightweight LLM call
            try:
                llm = get_llm(model=model or ANALYTICS_MODEL, provider=provider or _detect_provider(model or ANALYTICS_MODEL), temperature=0)
                result_str = json.dumps(result, default=str)
                prompt = SIMPLE_QUERY_PROMPT.format(
                    result=result_str, viz_type=viz_type, title=title,
                    x_key=x_key, y_key=y_key,
                )
                response = llm.invoke([
                    SystemMessage(content=prompt),
                    HumanMessage(content=user_message),
                ])

                # Parse response
                resp_text = response.content if isinstance(response.content, str) else str(response.content)
                viz_config = _parse_viz_config(resp_text)

                # Token tracking
                token_info = _extract_token_info([response])

                return {
                    'summary': viz_config.get('summary', result_str),
                    'data': result,
                    'visualization': viz_config.get('visualization', viz_type),
                    'chart_config': viz_config.get('chart_config', {'title': title, 'x_key': x_key, 'y_key': y_key}),
                    'error': False,
                    'token_info': token_info,
                }
            except Exception as e:
                logger.warning(f"[Simple path] LLM call failed: {e}, falling back to raw result")
                # Return raw result without LLM summary
                if isinstance(result, dict):
                    summary = ', '.join(f"{k}: {v}" for k, v in result.items())
                else:
                    summary = f"Found {len(result)} results."

                return {
                    'summary': summary,
                    'data': result,
                    'visualization': viz_type,
                    'chart_config': {'title': title, 'x_key': x_key, 'y_key': y_key},
                    'error': False,
                    'token_info': {},
                }

    return None


# ── Response parsing helpers ──────────────────────────────────────

def _parse_viz_config(text: str) -> dict:
    """Extract visualization config JSON from LLM response text."""
    # Try ```json fenced block
    m = re.search(r'```json\s*(\{.*?\})\s*```', text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except (json.JSONDecodeError, TypeError):
            pass

    # Try raw JSON with "summary" key
    m = re.search(r'\{[^{}]*"summary"\s*:\s*"[^"]*"[^}]*(?:\{[^}]*\}[^}]*)?\}', text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except (json.JSONDecodeError, TypeError):
            pass

    # Try any JSON object in text
    m = re.search(r'\{[^{}]*\}', text)
    if m:
        try:
            parsed = json.loads(m.group(0))
            if 'summary' in parsed:
                return parsed
        except (json.JSONDecodeError, TypeError):
            pass

    return {}


def _extract_token_info(messages) -> dict:
    """Accumulate token usage across LLM messages."""
    total_input = 0
    total_output = 0
    model_name = ''

    for msg in messages:
        if hasattr(msg, 'type') and msg.type != 'ai' and not hasattr(msg, 'usage_metadata'):
            # For direct LLM responses (not typed as 'ai' in agent), still check
            pass

        um = getattr(msg, 'usage_metadata', None)
        if um:
            if isinstance(um, dict):
                total_input += um.get('input_tokens', 0)
                total_output += um.get('output_tokens', 0)
            else:
                total_input += getattr(um, 'input_tokens', 0)
                total_output += getattr(um, 'output_tokens', 0)

        rm = getattr(msg, 'response_metadata', None) or {}
        if not model_name:
            model_name = rm.get('model_name', '') or rm.get('model', '')
        if not um:
            tu = rm.get('token_usage', {})
            if tu:
                total_input += tu.get('prompt_tokens', 0)
                total_output += tu.get('completion_tokens', 0)
            else:
                um2 = rm.get('usage_metadata', {})
                if um2:
                    total_input += um2.get('prompt_token_count', 0) or um2.get('input_tokens', 0)
                    total_output += um2.get('candidates_token_count', 0) or um2.get('output_tokens', 0)

    return {
        'input_tokens': total_input,
        'output_tokens': total_output,
        'total_tokens': total_input + total_output,
        'model_name': model_name,
    }


# ── Main entry point ──────────────────────────────────────────────

def _detect_provider(model_name: str) -> str:
    """Detect the LLM provider from the model name."""
    if model_name.lower().startswith('gemini'):
        return 'gemini'
    return 'openai'


def run_ai_analytics(user_message: str, conversation_history: list = None, model: str = None) -> dict:
    """
    Main entry point. Tries the simple fast path first, falls back to the
    full ReAct agent for complex questions.
    """
    selected_model = model or ANALYTICS_MODEL
    provider = _detect_provider(selected_model)

    # ── Fast path: simple queries ──
    if not conversation_history or len(conversation_history) <= 1:
        simple_result = _try_simple_query(user_message, model=selected_model, provider=provider)
        if simple_result:
            logger.info("[AI Analytics] Used simple fast path")
            return simple_result

    # ── Full agent path ──
    logger.info(f"[AI Analytics] Using full agent path with model={selected_model}, provider={provider}")
    from langgraph.prebuilt import create_react_agent

    llm = get_llm(model=selected_model, provider=provider, temperature=ANALYTICS_TEMPERATURE)
    agent = create_react_agent(
        llm,
        AGENT_TOOLS,
        prompt=AGENT_SYSTEM_PROMPT,
    )

    # Build messages from conversation history
    messages = []
    if conversation_history:
        for msg in conversation_history[-6:]:  # Reduced from 10 to 6 to save tokens
            role = msg.get('role', '')
            content = msg.get('content', '')
            if role == 'user':
                messages.append(HumanMessage(content=content))
            elif role == 'assistant':
                messages.append(AIMessage(content=content))

    messages.append(HumanMessage(content=user_message))

    from langgraph.errors import GraphRecursionError

    MAX_TOOL_CALLS = 6  # Hard cap on tool invocations regardless of recursion limit

    hit_recursion_limit = False
    try:
        result = agent.invoke(
            {"messages": messages},
            config={"recursion_limit": AGENT_RECURSION_LIMIT},
        )
        agent_messages = result.get("messages", [])

        # Safety check: if agent made too many tool calls, it may have looped
        actual_tool_calls = sum(1 for m in agent_messages if hasattr(m, 'type') and m.type == 'tool')
        if actual_tool_calls > MAX_TOOL_CALLS:
            logger.warning(f"[AI Analytics] Agent made {actual_tool_calls} tool calls (cap={MAX_TOOL_CALLS}), treating as partial")
            hit_recursion_limit = True

    except GraphRecursionError:
        logger.warning("[AI Analytics] Agent hit recursion limit, salvaging partial results")
        hit_recursion_limit = True
        agent_messages = messages  # Use what we have
    except Exception as e:
        logger.error(f"Agent invocation failed: {e}", exc_info=True)
        return {
            'summary': 'Sorry, something went wrong while processing your question. Please try again.',
            'data': None,
            'visualization': 'number',
            'chart_config': {},
            'error': True,
            'token_info': {},
        }

    # ── Debug: log agent messages and count steps ──
    num_ai_steps = sum(1 for m in agent_messages if hasattr(m, 'type') and m.type == 'ai')
    num_tool_calls = sum(1 for m in agent_messages if hasattr(m, 'type') and m.type == 'tool')
    logger.info(f"[Agent] Steps: {len(agent_messages)} msgs, {num_ai_steps} AI, {num_tool_calls} tools, limit={AGENT_RECURSION_LIMIT}, hit_limit={hit_recursion_limit}")
    for i, msg in enumerate(agent_messages):
        msg_type = getattr(msg, 'type', '?')
        msg_name = getattr(msg, 'name', '')
        content_preview = ''
        if hasattr(msg, 'content') and msg.content:
            c = msg.content if isinstance(msg.content, str) else str(msg.content)
            content_preview = c[:200]
        logger.info(f"[Agent msg {i}] type={msg_type} name={msg_name} content={content_preview}")

    # ── Extract all successful query data from tool results ──
    all_query_results = []
    for msg in agent_messages:
        if hasattr(msg, 'type') and msg.type == 'tool' and hasattr(msg, 'name') and msg.name == 'run_database_query':
            content = msg.content if isinstance(msg.content, str) else str(msg.content)
            if not content.startswith('ERROR'):
                try:
                    parsed = json.loads(content)
                    # If compact_rows wrapped it, unwrap the rows
                    if isinstance(parsed, dict) and 'rows' in parsed and parsed.get('truncated'):
                        all_query_results.append(parsed['rows'])
                    else:
                        all_query_results.append(parsed)
                    logger.info(f"[Agent] Query result #{len(all_query_results)}: {str(all_query_results[-1])[:200]}")
                except (json.JSONDecodeError, TypeError):
                    pass
    last_query_data = all_query_results[-1] if all_query_results else None

    # ── Get the final AI message text ──
    final_text = ''
    for msg in reversed(agent_messages):
        if hasattr(msg, 'type') and msg.type == 'ai' and msg.content:
            content = msg.content if isinstance(msg.content, str) else str(msg.content)
            if content.strip():
                final_text = content
                break
    logger.info(f"[Agent] Final text: {final_text[:500]}")

    # ── Parse visualization config ──
    viz_config = _parse_viz_config(final_text)
    summary = viz_config.get('summary', '')
    visualization = viz_config.get('visualization', 'table')
    chart_config = viz_config.get('chart_config', {})

    # If parsing failed, use cleaned text as summary
    if not summary:
        clean = re.sub(r'```json\s*\{.*?\}\s*```', '', final_text, flags=re.DOTALL).strip()
        clean = re.sub(r'\{[^{}]*"summary"[^}]*\}', '', clean, flags=re.DOTALL).strip()
        summary = clean or final_text

    # ── Handle recursion limit: build best-effort response from collected data ──
    if hit_recursion_limit and (not summary or 'need more steps' in summary.lower()):
        if all_query_results:
            parts = []
            for i, qr in enumerate(all_query_results):
                if isinstance(qr, dict):
                    parts.append(', '.join(f"{k}: {v}" for k, v in qr.items()))
                elif isinstance(qr, list):
                    parts.append(f"Query {i+1}: {len(qr)} results")
            summary = 'Here are the partial results I found: ' + '. '.join(parts) + '.'
            # Pick best viz type based on available data
            if isinstance(last_query_data, list) and len(last_query_data) > 1:
                visualization = 'bar'
                keys = list(last_query_data[0].keys())
                chart_config = {'title': 'Results', 'x_key': keys[0], 'y_key': keys[1] if len(keys) > 1 else keys[0]}
            elif isinstance(last_query_data, dict):
                visualization = 'number'
        else:
            summary = 'This question requires a complex analysis. Please try breaking it into simpler questions.'

    # ── Smart data selection ──
    chart_types = {'bar', 'pie', 'line', 'area', 'table'}
    if visualization in chart_types and last_query_data is not None:
        is_single_dict = isinstance(last_query_data, dict)
        if is_single_dict and len(all_query_results) > 1:
            for prev_result in reversed(all_query_results[:-1]):
                if isinstance(prev_result, list) and len(prev_result) > 1:
                    logger.info(f"[Agent] Upgrading viz data: array ({len(prev_result)} rows) over single dict")
                    last_query_data = prev_result
                    break

    if visualization == 'number' and isinstance(last_query_data, list) and len(last_query_data) > 1:
        logger.info(f"[Agent] Auto-upgrading viz: number → bar ({len(last_query_data)} rows)")
        visualization = 'bar'

    # ── Token usage ──
    ai_messages = [m for m in agent_messages if hasattr(m, 'type') and m.type == 'ai']
    token_info = _extract_token_info(ai_messages)

    return {
        'summary': summary,
        'data': last_query_data,
        'visualization': visualization,
        'chart_config': chart_config,
        'error': False,
        'token_info': token_info,
    }
