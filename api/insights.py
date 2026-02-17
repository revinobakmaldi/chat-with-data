from http.server import BaseHTTPRequestHandler
import json
import os
import re
import sys
import urllib.request

FALLBACK_PLAN = {"queries": []}
FALLBACK_INSIGHTS = {
    "summary": "Unable to generate insights. Please try again.",
    "insights": [],
}

RECHARTS_SCOPE_DOC = """AVAILABLE SCOPE for chartCode (these variables/components are already in scope — do NOT import anything):
- data: array of objects with the query result rows
- Recharts components: ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, ScatterChart, Scatter, Cell, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend,
  RadialBarChart, RadialBar, ComposedChart, Treemap, Funnel, FunnelChart
- Style helpers: COLORS (array of 8 hex colors), tooltipStyle (object), tickStyle (object),
  axisLineStyle (object), gridStroke (string)"""


def build_plan_prompt(schema: dict) -> str:
    columns_desc = "\n".join(
        f"- {col['name']} ({col['type']})" for col in schema["columns"]
    )

    header = " | ".join(col["name"] for col in schema["columns"])
    sample_lines = []
    for row in schema.get("sampleRows", []):
        vals = " | ".join(
            str(row.get(col["name"], "NULL")) for col in schema["columns"]
        )
        sample_lines.append(f"| {vals} |")
    sample_rows = "\n".join(sample_lines)

    return f"""You are a data analyst. Analyze this dataset and create an analysis plan.

TABLE: {schema['tableName']}
TOTAL ROWS: {schema.get('rowCount', 'unknown')}
COLUMNS:
{columns_desc}

SAMPLE ROWS:
| {header} |
{sample_rows}

Create 5-8 analytical SQL queries that will reveal the most important business insights from this data.
Cover different aspects: distributions, aggregations, trends, outliers, correlations.

Return ONLY valid JSON (no markdown fences) with this structure:
{{
  "queries": [
    {{
      "id": "q1",
      "title": "Short descriptive title",
      "sql": "SELECT ... FROM {schema['tableName']} ...",
      "rationale": "Why this query is useful"
    }}
  ]
}}

RULES:
1. Use only SELECT statements on table "{schema['tableName']}"
2. Each query should return at most 20 rows (use LIMIT 20)
3. Focus on aggregations, groupings, and summaries — not raw row dumps
4. Make queries DuckDB-compatible
5. Return raw JSON only, no markdown code blocks"""


def build_synthesize_prompt(schema: dict, plan_with_results: list) -> str:
    columns_desc = "\n".join(
        f"- {col['name']} ({col['type']})" for col in schema["columns"]
    )

    results_text = ""
    for item in plan_with_results:
        results_text += f"\n### {item['title']} (id: {item['id']})\n"
        results_text += f"SQL: {item['sql']}\n"
        if item.get("error"):
            results_text += f"ERROR: {item['error']}\n"
        elif item.get("result"):
            result = item["result"]
            cols = result.get("columns", [])
            rows = result.get("rows", [])
            if cols and rows:
                results_text += f"Columns: {', '.join(cols)}\n"
                for row in rows[:20]:
                    vals = " | ".join(str(row.get(c, "NULL")) for c in cols)
                    results_text += f"  {vals}\n"
            else:
                results_text += "No results returned.\n"

    return f"""You are a senior data analyst. Based on the query results below, produce prioritized business insights.

TABLE: {schema['tableName']}
COLUMNS:
{columns_desc}

QUERY RESULTS:
{results_text}

{RECHARTS_SCOPE_DOC}

Return ONLY valid JSON (no markdown fences) with this structure:
{{
  "summary": "2-3 sentence executive summary of the dataset",
  "insights": [
    {{
      "title": "Concise insight title",
      "priority": "high|medium|low",
      "finding": "Detailed explanation of the insight and its business implications",
      "sql": "The SQL query that produced this insight",
      "chartCode": "<ResponsiveContainer width=\\"100%\\" height=\\"100%\\">...</ResponsiveContainer>",
      "chartTitle": "Chart title"
    }}
  ]
}}

RULES:
1. Produce 3-6 insights, sorted by business impact (high priority first)
2. Each insight must reference actual data from the results
3. Only include "chartCode" when the data is genuinely suitable for visualization — set to null otherwise
4. chartCode must be a SINGLE JSX expression wrapped in <ResponsiveContainer width="100%" height="100%">
5. Use the `data` variable in chartCode — it contains the query result rows
6. Use COLORS[i] for fill/stroke, tooltipStyle/tickStyle/axisLineStyle/gridStroke for styling
7. Column names in dataKey props must exactly match the query result columns
8. Priority: "high" = actionable/critical, "medium" = notable patterns, "low" = informational
9. Return raw JSON only, no markdown code blocks"""


def _extract_json_object(text: str) -> dict | None:
    """Extract the first top-level JSON object from text using brace counting."""
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(text)):
        ch = text[i]
        if escape:
            escape = False
            continue
        if ch == "\\":
            if in_string:
                escape = True
            continue
        if ch == '"' and not escape:
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start : i + 1])
                except json.JSONDecodeError:
                    return None
    return None


def parse_plan_response(raw: str) -> dict:
    text = raw.strip()

    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    parsed = None
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        parsed = _extract_json_object(text)

    if not isinstance(parsed, dict):
        # Try to find a JSON array pattern for queries
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if match:
            try:
                arr = json.loads(match.group())
                if isinstance(arr, list):
                    return {"queries": arr}
            except json.JSONDecodeError:
                pass
        return dict(FALLBACK_PLAN)

    queries = parsed.get("queries")
    # If "queries" key is missing, look for any list-valued key
    if not isinstance(queries, list):
        for key, val in parsed.items():
            if isinstance(val, list) and len(val) > 0 and isinstance(val[0], dict):
                queries = val
                break
    if not isinstance(queries, list):
        return dict(FALLBACK_PLAN)

    valid = []
    for idx, q in enumerate(queries):
        if (
            isinstance(q, dict)
            and isinstance(q.get("title"), str)
            and isinstance(q.get("sql"), str)
        ):
            raw_id = q.get("id")
            if isinstance(raw_id, str) and raw_id:
                qid = raw_id
            elif isinstance(raw_id, (int, float)):
                qid = str(raw_id)
            else:
                qid = f"q{idx + 1}"
            valid.append({
                "id": qid,
                "title": q["title"],
                "sql": q["sql"],
                "rationale": q.get("rationale", ""),
            })

    return {"queries": valid}


def parse_insights_response(raw: str) -> dict:
    text = raw.strip()

    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    parsed = None
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(
            r"\{[^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*\}",
            text,
            re.DOTALL,
        )
        if match:
            try:
                parsed = json.loads(match.group())
            except json.JSONDecodeError:
                pass

    if not isinstance(parsed, dict):
        return dict(FALLBACK_INSIGHTS)

    summary = parsed.get("summary", "")
    if not isinstance(summary, str) or not summary:
        summary = "Analysis complete."

    insights_raw = parsed.get("insights", [])
    if not isinstance(insights_raw, list):
        return {"summary": summary, "insights": []}

    valid_priorities = {"high", "medium", "low"}
    valid = []
    for item in insights_raw:
        if not isinstance(item, dict):
            continue
        if not isinstance(item.get("title"), str):
            continue
        if not isinstance(item.get("finding"), str):
            continue

        priority = item.get("priority", "medium")
        if priority not in valid_priorities:
            priority = "medium"

        entry = {
            "title": item["title"],
            "priority": priority,
            "finding": item["finding"],
            "sql": item.get("sql", ""),
        }

        chart_code = item.get("chartCode")
        if isinstance(chart_code, str) and chart_code.strip():
            entry["chartCode"] = chart_code
            chart_title = item.get("chartTitle")
            if isinstance(chart_title, str) and chart_title.strip():
                entry["chartTitle"] = chart_title

        valid.append(entry)

    return {"summary": summary, "insights": valid}


def call_openrouter(system_prompt: str, user_message: str, max_tokens: int = 1024) -> str:
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable not set")

    payload = json.dumps({
        "model": "openai/gpt-oss-120b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.1,
        "max_tokens": max_tokens,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    choice = data["choices"][0]
    content = choice["message"]["content"]
    finish_reason = choice.get("finish_reason", "")
    if finish_reason == "length":
        print(f"[insights] WARNING: response truncated (finish_reason=length, len={len(content)})", file=sys.stderr)
    return content


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode("utf-8"))

            phase = data.get("phase")
            schema = data.get("schema")

            if not schema:
                self._send_error(400, "Missing schema")
                return

            if phase == "plan":
                self._handle_plan(schema)
            elif phase == "synthesize":
                plan_with_results = data.get("planWithResults", [])
                if not plan_with_results:
                    self._send_error(400, "Missing planWithResults")
                    return
                self._handle_synthesize(schema, plan_with_results)
            else:
                self._send_error(400, "Invalid phase: must be 'plan' or 'synthesize'")

        except json.JSONDecodeError:
            self._send_error(400, "Invalid JSON in request body")
        except ValueError as e:
            self._send_error(500, str(e))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="replace")
            self._send_error(502, f"LLM API error ({e.code}): {error_body[:200]}")
        except Exception as e:
            self._send_error(500, f"Internal error: {str(e)}")

    def _handle_plan(self, schema: dict):
        system_prompt = build_plan_prompt(schema)
        raw = call_openrouter(system_prompt, "Analyze this dataset and create an analysis plan.", max_tokens=4096)
        print(f"[insights] plan raw LLM response ({len(raw)} chars): {raw[:500]}", file=sys.stderr)
        result = parse_plan_response(raw)
        print(f"[insights] plan parsed: {len(result.get('queries', []))} queries", file=sys.stderr)
        self._send_json(200, result)

    def _handle_synthesize(self, schema: dict, plan_with_results: list):
        n_results = sum(1 for q in plan_with_results if q.get("result"))
        n_errors = sum(1 for q in plan_with_results if q.get("error"))
        print(f"[insights] synthesize input: {len(plan_with_results)} queries ({n_results} with results, {n_errors} with errors)", file=sys.stderr)
        system_prompt = build_synthesize_prompt(schema, plan_with_results)
        raw = call_openrouter(system_prompt, "Synthesize the query results into prioritized business insights.", max_tokens=4096)
        print(f"[insights] synthesize raw LLM response ({len(raw)} chars): {raw[:500]}", file=sys.stderr)
        result = parse_insights_response(raw)
        print(f"[insights] synthesize parsed: {len(result.get('insights', []))} insights", file=sys.stderr)
        self._send_json(200, result)

    def _send_json(self, status: int, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_error(self, status: int, message: str):
        self._send_json(status, {"error": message})
