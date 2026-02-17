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
        # Should not contain row 50+ data in the table
        assert "r50" not in prompt

    def test_describes_ykeys_format(self):
        prompt = build_visualize_prompt("q", "SELECT ...", SAMPLE_COLUMNS, SAMPLE_ROWS)
        assert "yKeys" in prompt


class TestParseVisualizeResponse:
    def test_valid_chart_spec(self):
        raw = json.dumps({
            "chart": {
                "type": "bar",
                "title": "Revenue by Region",
                "xKey": "region",
                "yKeys": [{"key": "revenue", "label": "Revenue"}],
                "stacked": False,
            }
        })
        result = parse_visualize_response(raw)
        chart = result["chart"]
        assert chart is not None
        assert chart["type"] == "bar"
        assert chart["xKey"] == "region"
        assert len(chart["yKeys"]) == 1
        assert chart["yKeys"][0]["key"] == "revenue"
        assert chart["stacked"] is False

    def test_multi_series(self):
        raw = json.dumps({
            "chart": {
                "type": "bar",
                "title": "Revenue vs Cost",
                "xKey": "region",
                "yKeys": [
                    {"key": "revenue", "label": "Revenue"},
                    {"key": "cost", "label": "Cost"},
                ],
                "stacked": True,
            }
        })
        result = parse_visualize_response(raw)
        chart = result["chart"]
        assert chart is not None
        assert len(chart["yKeys"]) == 2
        assert chart["stacked"] is True

    def test_null_chart(self):
        raw = json.dumps({"chart": None})
        result = parse_visualize_response(raw)
        assert result["chart"] is None

    def test_invalid_chart_type(self):
        raw = json.dumps({
            "chart": {
                "type": "radar",
                "title": "Test",
                "xKey": "x",
                "yKeys": [{"key": "y"}],
            }
        })
        result = parse_visualize_response(raw)
        assert result["chart"] is None

    def test_missing_xkey(self):
        raw = json.dumps({
            "chart": {
                "type": "bar",
                "title": "Test",
                "yKeys": [{"key": "y"}],
            }
        })
        result = parse_visualize_response(raw)
        assert result["chart"] is None

    def test_empty_ykeys(self):
        raw = json.dumps({
            "chart": {
                "type": "bar",
                "title": "Test",
                "xKey": "x",
                "yKeys": [],
            }
        })
        result = parse_visualize_response(raw)
        assert result["chart"] is None

    def test_invalid_ykeys_entries_filtered(self):
        raw = json.dumps({
            "chart": {
                "type": "bar",
                "title": "Test",
                "xKey": "x",
                "yKeys": [{"key": "y"}, {"bad": "entry"}, "not_an_object"],
            }
        })
        result = parse_visualize_response(raw)
        chart = result["chart"]
        assert chart is not None
        assert len(chart["yKeys"]) == 1
        assert chart["yKeys"][0]["key"] == "y"

    def test_markdown_wrapped(self):
        raw = '```json\n{"chart": {"type": "line", "title": "T", "xKey": "x", "yKeys": [{"key": "y"}]}}\n```'
        result = parse_visualize_response(raw)
        assert result["chart"] is not None
        assert result["chart"]["type"] == "line"

    def test_invalid_json_returns_null(self):
        result = parse_visualize_response("this is not json")
        assert result["chart"] is None

    def test_empty_string_returns_null(self):
        result = parse_visualize_response("")
        assert result["chart"] is None

    def test_ykeys_with_optional_fields(self):
        raw = json.dumps({
            "chart": {
                "type": "bar",
                "title": "Test",
                "xKey": "x",
                "yKeys": [{"key": "y", "label": "Y Value", "color": "#ff0000"}],
            }
        })
        result = parse_visualize_response(raw)
        chart = result["chart"]
        assert chart is not None
        assert chart["yKeys"][0]["label"] == "Y Value"
        assert chart["yKeys"][0]["color"] == "#ff0000"

    def test_missing_title_gets_default(self):
        raw = json.dumps({
            "chart": {
                "type": "bar",
                "xKey": "x",
                "yKeys": [{"key": "y"}],
            }
        })
        result = parse_visualize_response(raw)
        assert result["chart"] is not None
        assert result["chart"]["title"] == "Chart"
