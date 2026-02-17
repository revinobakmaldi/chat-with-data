import json
import pytest
import pandas as pd
from api.visualize import build_visualize_prompt, parse_visualize_response, execute_plot_code


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

    def test_contains_plotly_scope_doc(self):
        prompt = build_visualize_prompt("q", "SELECT ...", SAMPLE_COLUMNS, SAMPLE_ROWS)
        assert "pandas" in prompt
        assert "plotly" in prompt
        assert "fig" in prompt

    def test_asks_for_python_code(self):
        prompt = build_visualize_prompt("q", "SELECT ...", SAMPLE_COLUMNS, SAMPLE_ROWS)
        assert "pythonCode" in prompt


class TestParseVisualizeResponse:
    def test_valid_python_code(self):
        raw = json.dumps({
            "pythonCode": "fig = px.bar(df, x='region', y='revenue')",
            "chartTitle": "Revenue by Region",
        })
        result = parse_visualize_response(raw)
        assert result["pythonCode"] is not None
        assert "px.bar" in result["pythonCode"]
        assert result["chartTitle"] == "Revenue by Region"

    def test_null_python_code(self):
        raw = json.dumps({"pythonCode": None})
        result = parse_visualize_response(raw)
        assert result["pythonCode"] is None

    def test_missing_python_code(self):
        raw = json.dumps({"something": "else"})
        result = parse_visualize_response(raw)
        assert result["pythonCode"] is None

    def test_empty_string_python_code(self):
        raw = json.dumps({"pythonCode": ""})
        result = parse_visualize_response(raw)
        assert result["pythonCode"] is None

    def test_whitespace_only_python_code(self):
        raw = json.dumps({"pythonCode": "   "})
        result = parse_visualize_response(raw)
        assert result["pythonCode"] is None

    def test_markdown_wrapped(self):
        inner = json.dumps({
            "pythonCode": "fig = px.line(df, x='region', y='revenue')",
            "chartTitle": "T",
        })
        raw = f"```json\n{inner}\n```"
        result = parse_visualize_response(raw)
        assert result["pythonCode"] is not None
        assert "px.line" in result["pythonCode"]

    def test_invalid_json_returns_null(self):
        result = parse_visualize_response("this is not json")
        assert result["pythonCode"] is None

    def test_empty_string_returns_null(self):
        result = parse_visualize_response("")
        assert result["pythonCode"] is None

    def test_missing_title_gets_default(self):
        raw = json.dumps({
            "pythonCode": "fig = px.bar(df, x='region', y='revenue')",
        })
        result = parse_visualize_response(raw)
        assert result["pythonCode"] is not None
        assert result["chartTitle"] == "Chart"

    def test_non_string_title_gets_default(self):
        raw = json.dumps({
            "pythonCode": "fig = px.bar(df, x='region', y='revenue')",
            "chartTitle": 123,
        })
        result = parse_visualize_response(raw)
        assert result["chartTitle"] == "Chart"


class TestExecutePlotCode:
    def test_simple_bar_chart(self):
        df = pd.DataFrame(SAMPLE_ROWS)
        code = "fig = px.bar(df, x='region', y='revenue')"
        result = execute_plot_code(code, df)
        assert "data" in result
        assert "layout" in result

    def test_pivot_heatmap(self):
        rows = [
            {"region": "North", "category": "A", "value": 10},
            {"region": "South", "category": "B", "value": 20},
        ]
        df = pd.DataFrame(rows)
        code = """pivot = df.pivot_table(index='region', columns='category', values='value', aggfunc='mean')
fig = px.imshow(pivot, text_auto=True)"""
        result = execute_plot_code(code, df)
        assert "data" in result

    def test_missing_fig_raises(self):
        df = pd.DataFrame(SAMPLE_ROWS)
        code = "x = 1 + 2"
        with pytest.raises(ValueError, match="fig"):
            execute_plot_code(code, df)

    def test_restricted_builtins(self):
        df = pd.DataFrame(SAMPLE_ROWS)
        code = "open('/etc/passwd')"
        with pytest.raises(Exception):
            execute_plot_code(code, df)
