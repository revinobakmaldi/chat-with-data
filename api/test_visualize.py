import json
import pytest
from api.visualize import build_visualize_prompt, parse_visualize_response


SAMPLE_COLUMNS = ["region", "revenue", "cost"]
SAMPLE_ROWS = [
    {"region": "North", "revenue": 1000, "cost": 500},
    {"region": "South", "revenue": 800, "cost": 400},
    {"region": "East", "revenue": 1200, "cost": 600},
]


class TestBuildVisualizePrompt:
    def test_contains_question(self):
        prompt = build_visualize_prompt("show revenue by region", "SELECT ...", SAMPLE_COLUMNS, SAMPLE_ROWS)
        assert "show revenue by region" in prompt

    def test_contains_sql(self):
        prompt = build_visualize_prompt("q", "SELECT region, revenue FROM t", SAMPLE_COLUMNS, SAMPLE_ROWS)
        assert "SELECT region, revenue FROM t" in prompt

    def test_contains_columns(self):
        prompt = build_visualize_prompt("q", "SELECT ...", SAMPLE_COLUMNS, SAMPLE_ROWS)
        assert "region" in prompt
        assert "revenue" in prompt
        assert "cost" in prompt

    def test_contains_row_data(self):
        prompt = build_visualize_prompt("q", "SELECT ...", SAMPLE_COLUMNS, SAMPLE_ROWS)
        assert "North" in prompt
        assert "1000" in prompt

    def test_caps_rows_at_50(self):
        many_rows = [{"region": f"r{i}", "revenue": i, "cost": i} for i in range(100)]
        prompt = build_visualize_prompt("q", "SELECT ...", SAMPLE_COLUMNS, many_rows)
        assert "100 total rows, showing up to 50" in prompt
        assert "r50" not in prompt

    def test_contains_recharts_scope_doc(self):
        prompt = build_visualize_prompt("q", "SELECT ...", SAMPLE_COLUMNS, SAMPLE_ROWS)
        assert "ResponsiveContainer" in prompt
        assert "COLORS" in prompt
        assert "tooltipStyle" in prompt

    def test_asks_for_jsx(self):
        prompt = build_visualize_prompt("q", "SELECT ...", SAMPLE_COLUMNS, SAMPLE_ROWS)
        assert "chartCode" in prompt


class TestParseVisualizeResponse:
    def test_valid_chart_code(self):
        raw = json.dumps({
            "chartCode": '<ResponsiveContainer width="100%" height="100%"><BarChart data={data}><Bar dataKey="revenue" /></BarChart></ResponsiveContainer>',
            "chartTitle": "Revenue by Region",
        })
        result = parse_visualize_response(raw)
        assert result["chartCode"] is not None
        assert "BarChart" in result["chartCode"]
        assert result["chartTitle"] == "Revenue by Region"

    def test_null_chart_code(self):
        raw = json.dumps({"chartCode": None})
        result = parse_visualize_response(raw)
        assert result["chartCode"] is None

    def test_missing_chart_code(self):
        raw = json.dumps({"something": "else"})
        result = parse_visualize_response(raw)
        assert result["chartCode"] is None

    def test_empty_string_chart_code(self):
        raw = json.dumps({"chartCode": ""})
        result = parse_visualize_response(raw)
        assert result["chartCode"] is None

    def test_whitespace_only_chart_code(self):
        raw = json.dumps({"chartCode": "   "})
        result = parse_visualize_response(raw)
        assert result["chartCode"] is None

    def test_markdown_wrapped(self):
        inner = json.dumps({
            "chartCode": '<ResponsiveContainer width="100%" height="100%"><LineChart data={data}><Line dataKey="revenue" /></LineChart></ResponsiveContainer>',
            "chartTitle": "T",
        })
        raw = f"```json\n{inner}\n```"
        result = parse_visualize_response(raw)
        assert result["chartCode"] is not None
        assert "LineChart" in result["chartCode"]

    def test_invalid_json_returns_null(self):
        result = parse_visualize_response("this is not json")
        assert result["chartCode"] is None

    def test_empty_string_returns_null(self):
        result = parse_visualize_response("")
        assert result["chartCode"] is None

    def test_missing_title_gets_default(self):
        raw = json.dumps({
            "chartCode": '<ResponsiveContainer width="100%" height="100%"><BarChart data={data}><Bar dataKey="y" /></BarChart></ResponsiveContainer>',
        })
        result = parse_visualize_response(raw)
        assert result["chartCode"] is not None
        assert result["chartTitle"] == "Chart"

    def test_non_string_title_gets_default(self):
        raw = json.dumps({
            "chartCode": '<ResponsiveContainer width="100%" height="100%"><BarChart data={data}><Bar dataKey="y" /></BarChart></ResponsiveContainer>',
            "chartTitle": 123,
        })
        result = parse_visualize_response(raw)
        assert result["chartTitle"] == "Chart"
