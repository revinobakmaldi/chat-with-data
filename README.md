# Chat with Data

Natural language SQL analytics tool. Upload a CSV, ask questions in plain English, and get SQL queries, results, and charts — all in the browser.

**Live demo:** [chat-with-data-csv.vercel.app](https://chat-with-data-csv.vercel.app)

## How It Works

```
Browser (DuckDB-WASM)            Vercel Serverless (Python)
┌─────────────────────┐          ┌──────────────────────┐
│ CSV → DuckDB table  │          │ /api/chat            │
│ Schema extraction   │─────────>│ Build system prompt   │
│ SQL execution       │<─────────│ Call OpenRouter LLM   │
│ Recharts rendering  │          │ Return SQL + chart    │
└─────────────────────┘          └──────────────────────┘
```

- **CSV parsing & SQL execution** happen client-side via DuckDB-WASM — no data leaves the browser
- **LLM calls** go through a Python serverless function that talks to OpenRouter
- The LLM receives only the table schema and sample rows, then returns SQL + optional chart config
- SQL runs on DuckDB in the browser, results render as tables and Recharts visualizations

## Tech Stack

- **Next.js 16** / React 19 / TypeScript
- **Tailwind CSS 4** / Framer Motion
- **DuckDB-WASM** — in-browser SQL engine
- **Recharts** — bar, line, area, and pie charts
- **Python serverless** — OpenRouter API integration
- **Vercel** — deployment

## Getting Started

```bash
git clone https://github.com/revinobakmaldi/chat-with-data.git
cd chat-with-data
npm install
```

Create a `.env.local` file:

```
OPENROUTER_API_KEY=your_key_here
```

Get a free API key from [openrouter.ai](https://openrouter.ai).

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Import the repo on [vercel.com](https://vercel.com)
2. Add `OPENROUTER_API_KEY` as an environment variable
3. Deploy

## Project Structure

```
app/
  layout.tsx          # Root layout (Geist fonts, dark theme)
  page.tsx            # State machine: upload → loading → ready
api/
  chat.py             # Python serverless → OpenRouter LLM
components/
  shared/             # Animated background, navbar
  upload/             # File dropzone, sample dataset button
  chat/               # Chat container, messages, input, SQL results, charts, schema sidebar
lib/
  duckdb.ts           # DuckDB-WASM init, CSV load, query execution
  schema.ts           # Schema extraction from DuckDB
  prompt.ts           # System prompt builder + suggested questions
  api.ts              # Client-side API calls
  types.ts            # TypeScript interfaces
public/
  sample.csv          # Demo employee dataset (50 rows)
```

## License

MIT
