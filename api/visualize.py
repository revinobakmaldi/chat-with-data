from http.server import BaseHTTPRequestHandler
import json
import os
import re
import sys
import urllib.request


RECHARTS_SCOPE_DOC = """AVAILABLE SCOPE (these variables/components are already in scope — do NOT import anything):
- data: array of objects with the query result rows
- Recharts components: ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, ScatterChart, Scatter, Cell, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend,
  RadialBarChart, RadialBar, ComposedChart, Treemap, Funnel, FunnelChart
- Style helpers: COLORS (array of 8 hex colors), tooltipStyle (object), tickStyle (object),
  axisLineStyle (object), gridStroke (string)"""


def build_visualize_prompt(question: str, sql: str, columns: list, rows: list) -> str:
    capped_rows = rows[:50]
    header = " | ".join(columns)
    row_lines = []
    for row in capped_rows:
        vals = " | ".join(str(row.get(c, "NULL")) for c in columns)
        row_lines.append(f"| {vals} |")
    rows_text = "\n".join(row_lines)

    return f"""You are a data visualization expert. Given query results, decide if a chart is appropriate and write Recharts JSX code to render it.

USER QUESTION: {question}
SQL QUERY: {sql}

QUERY RESULTS ({len(rows)} total rows, showing up to 50):
Columns: {', '.join(columns)}
| {header} |
{rows_text}

{RECHARTS_SCOPE_DOC}

If the data is suitable for visualization, return a JSON object with "chartCode" containing a single JSX expression wrapped in <ResponsiveContainer width="100%" height="100%">...</ResponsiveContainer>.
If not (e.g., single scalar value, too many categories, or text-heavy results), return {{"chartCode": null}}.

Return ONLY valid JSON (no markdown fences) with this structure:
{{"chartCode": "<ResponsiveContainer width=\\"100%\\" height=\\"100%\\">...</ResponsiveContainer>", "chartTitle": "Chart title"}}

Or if no chart is appropriate:
{{"chartCode": null}}

RULES:
1. The JSX expression must be a SINGLE expression (no semicolons, no variable declarations, no imports)
2. Use the `data` variable directly — it contains the query result rows
3. Column names in dataKey props must exactly match the query result columns: {', '.join(columns)}
4. Use COLORS[i] for fill/stroke colors (e.g., COLORS[0], COLORS[1], etc.)
5. Use tooltipStyle, tickStyle, axisLineStyle, gridStroke for consistent styling
6. Use "pie" only when there are fewer than 8 categories
7. Use "line" for time-series or sequential data
8. Return raw JSON only, no markdown code blocks"""


def parse_visualize_response(raw: str) -> dict:
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
        match = re.search(r"\{[^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*\}", text, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group())
            except json.JSONDecodeError:
                pass

    if not isinstance(parsed, dict):
        return {"chartCode": None}

    chart_code = parsed.get("chartCode")
    if not isinstance(chart_code, str) or not chart_code.strip():
        return {"chartCode": None}

    chart_title = parsed.get("chartTitle", "Chart")
    if not isinstance(chart_title, str):
        chart_title = "Chart"

    return {"chartCode": chart_code, "chartTitle": chart_title}


def call_openrouter(system_prompt: str, user_message: str) -> str:
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
                self._send_json(200, {"chartCode": None})
                return

            system_prompt = build_visualize_prompt(question, sql, columns, rows)
            raw = call_openrouter(system_prompt, "Generate Recharts JSX code for these query results.")
            print(f"[visualize] raw LLM response ({len(raw)} chars): {raw[:500]}", file=sys.stderr)
            result = parse_visualize_response(raw)
            print(f"[visualize] parsed result: chartCode={'present' if result.get('chartCode') else 'null'}", file=sys.stderr)

            self._send_json(200, result)

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
