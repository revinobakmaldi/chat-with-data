import json
import pytest
from api.chat import build_system_prompt, parse_llm_response


SAMPLE_SCHEMA = {
    "tableName": "sales",
    "columns": [
        {"name": "id", "type": "INTEGER"},
        {"name": "amount", "type": "DOUBLE"},
    ],
    "sampleRows": [{"id": 1, "amount": 99.5}],
    "rowCount": 100,
}


class TestBuildSystemPrompt:
    def test_contains_table_name(self):
        prompt = build_system_prompt(SAMPLE_SCHEMA)
        assert "TABLE: sales" in prompt

    def test_contains_columns(self):
        prompt = build_system_prompt(SAMPLE_SCHEMA)
        assert "- id (INTEGER)" in prompt
        assert "- amount (DOUBLE)" in prompt

    def test_contains_sample_rows(self):
        prompt = build_system_prompt(SAMPLE_SCHEMA)
        assert "99.5" in prompt

    def test_contains_rules(self):
        prompt = build_system_prompt(SAMPLE_SCHEMA)
        assert "RULES:" in prompt
        assert "SELECT" in prompt

    def test_describes_both_response_formats(self):
        prompt = build_system_prompt(SAMPLE_SCHEMA)
        assert '"type": "sql"' in prompt
        assert '"type": "chat"' in prompt

    def test_instructs_conversational_replies(self):
        prompt = build_system_prompt(SAMPLE_SCHEMA)
        assert "conversationally" in prompt.lower() or "casual" in prompt.lower()


class TestParseLLMResponse:
    def test_valid_json(self):
        raw = json.dumps({"sql": "SELECT 1", "explanation": "test"})
        result = parse_llm_response(raw)
        assert result["sql"] == "SELECT 1"
        assert result["explanation"] == "test"

    def test_markdown_wrapped(self):
        raw = '```json\n{"sql": "SELECT 1", "explanation": "test"}\n```'
        result = parse_llm_response(raw)
        assert result["sql"] == "SELECT 1"
        assert result["explanation"] == "test"

    def test_invalid_json_returns_fallback(self):
        result = parse_llm_response("this is not json at all")
        assert result["sql"] == ""
        assert "couldn't generate" in result["explanation"].lower()
        assert result["chart"] is None

    def test_missing_keys_adds_defaults(self):
        raw = json.dumps({"sql": "SELECT 1"})
        result = parse_llm_response(raw)
        assert result["sql"] == "SELECT 1"
        assert "explanation" in result

    def test_extracts_json_block_from_surrounding_text(self):
        raw = 'Here is the result:\n{"sql": "SELECT 1", "explanation": "test"}\nHope this helps!'
        result = parse_llm_response(raw)
        assert result["sql"] == "SELECT 1"

    def test_valid_chart_passes(self):
        raw = json.dumps({
            "sql": "SELECT x, y FROM t",
            "explanation": "test",
            "chart": {"type": "bar", "xKey": "x", "yKey": "y", "title": "Test"},
        })
        result = parse_llm_response(raw)
        assert result["chart"]["type"] == "bar"

    def test_invalid_chart_type_nullified(self):
        raw = json.dumps({
            "sql": "SELECT 1",
            "explanation": "test",
            "chart": {"type": "radar", "xKey": "x", "yKey": "y"},
        })
        result = parse_llm_response(raw)
        assert result["chart"] is None

    def test_chart_missing_keys_nullified(self):
        raw = json.dumps({
            "sql": "SELECT 1",
            "explanation": "test",
            "chart": {"type": "bar"},
        })
        result = parse_llm_response(raw)
        assert result["chart"] is None

    def test_empty_string_returns_fallback(self):
        result = parse_llm_response("")
        assert result["sql"] == ""
        assert result["chart"] is None

    def test_chat_type_response(self):
        raw = json.dumps({"type": "chat", "message": "Hello! How can I help you today?"})
        result = parse_llm_response(raw)
        assert result["sql"] == ""
        assert result["explanation"] == "Hello! How can I help you today?"
        assert result["chart"] is None

    def test_chat_type_with_empty_message_returns_fallback(self):
        raw = json.dumps({"type": "chat", "message": ""})
        result = parse_llm_response(raw)
        assert result["sql"] == ""
        assert "couldn't generate" in result["explanation"].lower()

    def test_message_without_type_treated_as_chat(self):
        raw = json.dumps({"message": "That's great!"})
        result = parse_llm_response(raw)
        assert result["sql"] == ""
        assert result["explanation"] == "That's great!"
        assert result["chart"] is None

    def test_sql_type_response(self):
        raw = json.dumps({
            "type": "sql",
            "sql": "SELECT * FROM sales",
            "explanation": "Fetching all sales",
        })
        result = parse_llm_response(raw)
        assert result["sql"] == "SELECT * FROM sales"
        assert result["explanation"] == "Fetching all sales"

    def test_chat_response_in_markdown_fence(self):
        raw = '```json\n{"type": "chat", "message": "You\'re welcome!"}\n```'
        result = parse_llm_response(raw)
        assert result["sql"] == ""
        assert result["explanation"] == "You're welcome!"
