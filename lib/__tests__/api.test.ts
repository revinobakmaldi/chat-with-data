import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateLLMResponse, sendChatMessage } from "../api";

describe("validateLLMResponse", () => {
  it("accepts a valid response", () => {
    const data = { sql: "SELECT 1", explanation: "test" };
    expect(validateLLMResponse(data)).toEqual(data);
  });

  it("accepts a valid response with chart", () => {
    const data = {
      sql: "SELECT 1",
      explanation: "test",
      chart: { type: "bar", xKey: "x", yKey: "y", title: "T" },
    };
    expect(validateLLMResponse(data)).toEqual(data);
  });

  it("throws on missing sql", () => {
    expect(() => validateLLMResponse({ explanation: "test" })).toThrow(
      "missing or invalid 'sql'"
    );
  });

  it("throws on missing explanation", () => {
    expect(() => validateLLMResponse({ sql: "SELECT 1" })).toThrow(
      "missing or invalid 'explanation'"
    );
  });

  it("throws on invalid chart type", () => {
    expect(() =>
      validateLLMResponse({
        sql: "SELECT 1",
        explanation: "test",
        chart: { type: "radar", xKey: "x", yKey: "y" },
      })
    ).toThrow("chart config is malformed");
  });

  it("throws on non-object input", () => {
    expect(() => validateLLMResponse("string")).toThrow("expected an object");
    expect(() => validateLLMResponse(null)).toThrow("expected an object");
  });
});

describe("sendChatMessage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls fetch with correct body", async () => {
    const mockResponse = { sql: "SELECT 1", explanation: "test" };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const schema = {
      tableName: "t",
      columns: [{ name: "id", type: "INTEGER" }],
      sampleRows: [],
      rowCount: 0,
    };
    const messages = [{ role: "user" as const, content: "hello" }];

    await sendChatMessage(schema, messages);

    expect(fetchSpy).toHaveBeenCalledWith("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schema, messages }),
    });
  });

  it("throws on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    } as unknown as Response);

    const schema = {
      tableName: "t",
      columns: [],
      sampleRows: [],
      rowCount: 0,
    };

    await expect(
      sendChatMessage(schema, [{ role: "user", content: "hi" }])
    ).rejects.toThrow("Server error");
  });
});
