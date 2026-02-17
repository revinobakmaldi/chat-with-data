from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import traceback
import urllib.request

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go


PLOTLY_SCOPE_DOC = """AVAILABLE SCOPE (these variables are already defined — do NOT import anything):
- df: a pandas DataFrame containing the query result rows
- pd: the pandas module
- px: plotly.express
- go: plotly.graph_objects

You MUST produce a variable called `fig` (a plotly Figure object).
You CAN manipulate df freely: pivot_table, melt, groupby, sort_values, etc.
Use px.imshow for heatmaps/matrices, px.bar for bar charts, px.line for line charts, etc.
Do NOT set template, font colors, paper_bgcolor, or plot_bgcolor — the frontend handles all theming."""


def build_visualize_prompt(question: str, sql: str, columns: list, rows: list) -> str:
    capped_rows = rows[:50]
    header = " | ".join(columns)
    row_lines = []
    for row in capped_rows:
        vals = " | ".join(str(row.get(c, "NULL")) for c in columns)
        row_lines.append(f"| {vals} |")
    rows_text = "\n".join(row_lines)

    return f"""You are a data visualization expert. Given query results, decide if a chart is appropriate and write Python code using pandas and plotly to render it.

USER QUESTION: {question}
SQL QUERY: {sql}

QUERY RESULTS ({len(rows)} total rows, showing up to 50):
Columns: {', '.join(columns)}
| {header} |
{rows_text}

{PLOTLY_SCOPE_DOC}

If the data is suitable for visualization, return a JSON object with "pythonCode" containing Python code that creates a `fig` variable.
If not (e.g., single scalar value, too many categories, or text-heavy results), return {{"pythonCode": null}}.

Return ONLY valid JSON (no markdown fences) with this structure:
{{"pythonCode": "pivot = df.pivot_table(...)\\nfig = px.bar(...)", "chartTitle": "Chart title"}}

Or if no chart is appropriate:
{{"pythonCode": null}}

RULES:
1. The code must assign a plotly Figure to a variable called `fig`
2. Use `df` directly — it is a pandas DataFrame with the query result rows
3. Column names must exactly match: {', '.join(columns)}
4. You can freely transform df (pivot_table, melt, groupby, etc.) before charting
5. For matrix/heatmap visualizations, use px.imshow with df.pivot_table(...)
6. Do NOT set template, font colors, paper_bgcolor, or plot_bgcolor — the frontend handles theming
7. Use "pie" only when there are fewer than 8 categories
8. Use line charts for time-series or sequential data
9. Return raw JSON only, no markdown code blocks"""


def parse_visualize_response(raw: str) -> dict:
    text = raw.strip()

    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    import re
    parsed = None
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*\}", text, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group())
            except json.JSONDecodeError:
                pass

    if not isinstance(parsed, dict):
        return {"pythonCode": None}

    python_code = parsed.get("pythonCode")
    if not isinstance(python_code, str) or not python_code.strip():
        return {"pythonCode": None}

    chart_title = parsed.get("chartTitle", "Chart")
    if not isinstance(chart_title, str):
        chart_title = "Chart"

    return {"pythonCode": python_code, "chartTitle": chart_title}


def execute_plot_code(python_code: str, df: pd.DataFrame) -> dict:
    """Execute LLM-generated Python code in a restricted sandbox and return Plotly JSON."""
    allowed_globals = {
        "__builtins__": {},
        "pd": pd,
        "px": px,
        "go": go,
        "df": df,
        "print": lambda *a, **k: None,
    }

    exec(python_code, allowed_globals)

    fig = allowed_globals.get("fig")
    if fig is None:
        raise ValueError("Code did not produce a `fig` variable")

    if not isinstance(fig, go.Figure):
        raise ValueError(f"fig is not a plotly Figure (got {type(fig).__name__})")

    return json.loads(fig.to_json())


def call_openrouter(system_prompt: str, user_message: str) -> str:
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable not set")

    payload = json.dumps({
        "model": "openai/gpt-oss-120b:free",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.1,
        "max_tokens": 1024,
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

    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    return data["choices"][0]["message"]["content"]


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode("utf-8"))

            question = data.get("question", "")
            sql = data.get("sql", "")
            columns = data.get("columns", [])
            rows = data.get("rows", [])

            if not columns or not rows:
                self._send_json(200, {"plotlySpec": None})
                return

            system_prompt = build_visualize_prompt(question, sql, columns, rows)
            raw = call_openrouter(system_prompt, "Generate Python visualization code for these query results.")
            print(f"[visualize] raw LLM response ({len(raw)} chars): {raw[:500]}", file=sys.stderr)
            result = parse_visualize_response(raw)
            print(f"[visualize] parsed result: pythonCode={'present' if result.get('pythonCode') else 'null'}", file=sys.stderr)

            python_code = result.get("pythonCode")
            if not python_code:
                self._send_json(200, {"plotlySpec": None})
                return

            # Execute the Python code to produce a Plotly figure
            df = pd.DataFrame(rows, columns=columns)
            try:
                plotly_spec = execute_plot_code(python_code, df)
            except Exception as e:
                print(f"[visualize] exec error: {traceback.format_exc()}", file=sys.stderr)
                self._send_json(200, {"plotlySpec": None, "error": f"Chart code execution failed: {str(e)}"})
                return

            chart_title = result.get("chartTitle", "Chart")
            self._send_json(200, {"plotlySpec": plotly_spec, "chartTitle": chart_title})

        except json.JSONDecodeError:
            self._send_error(400, "Invalid JSON in request body")
        except ValueError as e:
            self._send_error(500, str(e))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="replace")
            self._send_error(502, f"LLM API error ({e.code}): {error_body[:200]}")
        except Exception as e:
            self._send_error(500, f"Internal error: {str(e)}")

    def _send_json(self, status: int, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_error(self, status: int, message: str):
        self._send_json(status, {"error": message})
