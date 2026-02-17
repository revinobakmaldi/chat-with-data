from http.server import BaseHTTPRequestHandler
import json
import os
import re
import urllib.request

VALID_CHART_TYPES = {"bar", "line", "pie", "area", "scatter"}


def build_visualize_prompt(question: str, sql: str, columns: list, rows: list) -> str:
    # Format rows as a table (cap at 50)
    capped_rows = rows[:50]
    header = " | ".join(columns)
    row_lines = []
    for row in capped_rows:
        vals = " | ".join(str(row.get(c, "NULL")) for c in columns)
        row_lines.append(f"| {vals} |")
    rows_text = "\n".join(row_lines)

    return f"""You are a data visualization expert. Given query results, decide if a chart is appropriate and generate a chart specification.

USER QUESTION: {question}
SQL QUERY: {sql}

QUERY RESULTS ({len(rows)} total rows, showing up to 50):
Columns: {', '.join(columns)}
| {header} |
{rows_text}

If the data is suitable for visualization, return a JSON chart spec. If not (e.g., single scalar value, too many categories, or text-heavy results), return null.

Return ONLY valid JSON (no markdown fences) with this structure:
{{"chart": {{"type": "bar|line|pie|area|scatter", "title": "Chart title", "xKey": "column_name", "yKeys": [{{"key": "column_name", "label": "Display label"}}], "stacked": false}} }}

Or if no chart is appropriate:
{{"chart": null}}

RULES:
1. xKey must be an exact column name from the results
2. Each yKeys entry must have a "key" that is an exact column name from the results
3. Use multiple yKeys entries when comparing multiple measures (e.g., revenue vs cost)
4. Use "stacked": true for part-of-whole comparisons across categories
5. Use "pie" only when there are fewer than 8 categories showing proportions
6. Use "line" for time-series or sequential data
7. Use "scatter" only when both axes are numeric
8. "label" in yKeys is optional — use it when the column name isn't human-readable
9. Return raw JSON only, no markdown code blocks"""


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
        return {"chart": None}

    chart = parsed.get("chart")
    if chart is None:
        return {"chart": None}

    if not isinstance(chart, dict):
        return {"chart": None}

    # Validate chart spec
    if chart.get("type") not in VALID_CHART_TYPES:
        return {"chart": None}
    if not isinstance(chart.get("xKey"), str):
        return {"chart": None}
    if not isinstance(chart.get("title"), str):
        chart["title"] = "Chart"

    y_keys = chart.get("yKeys")
    if not isinstance(y_keys, list) or len(y_keys) == 0:
        return {"chart": None}

    valid_y_keys = []
    for yk in y_keys:
        if isinstance(yk, dict) and isinstance(yk.get("key"), str):
            entry = {"key": yk["key"]}
            if isinstance(yk.get("label"), str):
                entry["label"] = yk["label"]
            if isinstance(yk.get("color"), str):
                entry["color"] = yk["color"]
            valid_y_keys.append(entry)

    if not valid_y_keys:
        return {"chart": None}

    return {
        "chart": {
            "type": chart["type"],
            "title": chart["title"],
            "xKey": chart["xKey"],
            "yKeys": valid_y_keys,
            "stacked": bool(chart.get("stacked", False)),
        }
    }


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
        "max_tokens": 512,
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
                self._send_json(200, {"chart": None})
                return

            system_prompt = build_visualize_prompt(question, sql, columns, rows)
            raw = call_openrouter(system_prompt, "Generate a chart specification for these query results.")
            result = parse_visualize_response(raw)

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
