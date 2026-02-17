from http.server import BaseHTTPRequestHandler
import json
import os
import re
import urllib.request

FALLBACK_RESPONSE = {
    "sql": "",
    "explanation": "I couldn't generate a valid response. Please try rephrasing your question.",
}


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

    return f"""You are a friendly data analyst assistant. You can have natural conversations AND write DuckDB-compatible SQL queries.

You have access to this dataset:

TABLE: {schema['tableName']}
TOTAL ROWS: {schema.get('rowCount', 'unknown')}
COLUMNS:
{columns_desc}

SAMPLE ROWS:
| {header} |
{sample_rows}

RESPONSE FORMAT:
Always return valid JSON (no markdown code blocks). Use one of these two formats:

1. When the user asks a data question (queries, analysis, aggregations, filters, etc.):
{{"type": "sql", "sql": "SELECT ...", "explanation": "..."}}

2. When the user is chatting (greetings, reactions, follow-up clarifications, thanks, etc.):
{{"type": "chat", "message": "your friendly response here"}}

RULES:
1. Only generate SQL when the user is clearly asking a data question
2. For casual messages (hi, wow, thanks, ok, etc.), respond conversationally — do NOT generate SQL
3. Use only SELECT statements (no INSERT/UPDATE/DELETE/DROP)
4. Always query from "{schema['tableName']}"
5. Keep SQL concise and readable
6. Limit results to 100 rows max unless the user asks for more
7. Use conversation history to understand follow-up questions (e.g. "break that down by month" refers to the previous query)
8. Do NOT wrap the JSON in markdown code blocks — return raw JSON only"""


def parse_llm_response(raw: str) -> dict:
    """Parse and validate an LLM response string into a structured dict.

    Handles markdown fences, extracts JSON blocks from surrounding text,
    and validates required keys. Returns a fallback on total failure.
    """
    text = raw.strip()

    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    # Try direct parse first
    parsed = None
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        # Try to extract first {...} block via regex
        match = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", text, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group())
            except json.JSONDecodeError:
                pass

    if not isinstance(parsed, dict):
        return dict(FALLBACK_RESPONSE)

    # Handle chat-type responses (conversational, no SQL)
    if parsed.get("type") == "chat" or (
        "message" in parsed and "sql" not in parsed
    ):
        message = parsed.get("message", "")
        if isinstance(message, str) and message:
            return {"sql": "", "explanation": message}
        return dict(FALLBACK_RESPONSE)

    # Ensure required keys with defaults
    if "sql" not in parsed or not isinstance(parsed.get("sql"), str):
        parsed["sql"] = ""
    if "explanation" not in parsed or not isinstance(parsed.get("explanation"), str):
        parsed["explanation"] = parsed.get("explanation", "No explanation provided.")

    # Strip chart if LLM still includes one (we handle charts separately now)
    parsed.pop("chart", None)

    return parsed


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
        "model": "openai/gpt-oss-120b",
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
    return parse_llm_response(content)


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

            # Keep last 5 pairs (10 messages) for context window management
            messages = messages[-10:]

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
