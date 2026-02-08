from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request


def build_system_prompt(schema: dict) -> str:
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

    return f"""You are a SQL analyst. You write DuckDB-compatible SQL queries.

TABLE: {schema['tableName']}
TOTAL ROWS: {schema.get('rowCount', 'unknown')}
COLUMNS:
{columns_desc}

SAMPLE ROWS:
| {header} |
{sample_rows}

RULES:
1. Return ONLY valid JSON with keys: sql, explanation, chart (optional)
2. Use only SELECT statements (no INSERT/UPDATE/DELETE/DROP)
3. Always query from "{schema['tableName']}"
4. For chart, specify: type (bar|line|pie|area), xKey, yKey, title
5. Only suggest a chart when the data is suitable for visualization (aggregations, comparisons, trends)
6. Keep SQL concise and readable
7. Limit results to 100 rows max unless the user asks for more
8. Do NOT wrap the JSON in markdown code blocks — return raw JSON only"""


def call_openrouter(system_prompt: str, messages: list) -> dict:
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable not set")

    api_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        api_messages.append({
            "role": msg["role"],
            "content": msg["content"],
        })

    payload = json.dumps({
        "model": "openai/gpt-oss-120b:free",
        "messages": api_messages,
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

    content = data["choices"][0]["message"]["content"]

    # Strip markdown code fences if present
    content = content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        # Remove first line (```json or ```) and last line (```)
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        content = "\n".join(lines).strip()

    return json.loads(content)


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode("utf-8"))

            schema = data.get("schema")
            messages = data.get("messages", [])

            if not schema:
                self._send_error(400, "Missing schema")
                return

            if not messages:
                self._send_error(400, "Missing messages")
                return

            system_prompt = build_system_prompt(schema)
            result = call_openrouter(system_prompt, messages)

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
