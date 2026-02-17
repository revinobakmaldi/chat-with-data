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
