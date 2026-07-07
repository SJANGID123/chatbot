"use client"

import type { ApiKeys, Candidate, ModelOpinion, ResearchReport, StockPick } from "./types"

const SEARCH_QUERIES = [
  "best penny stocks india NSE BSE to buy this week high volume breakout",
  "penny stocks under 50 rupees india multibagger short term momentum",
  "NSE top gainers penny stocks news catalyst this week",
]

const MAX_OPENROUTER_MODELS = 4

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data as T
}

export async function runWebResearch(
  serpKey: string,
  onProgress: (detail: string) => void,
): Promise<string> {
  const chunks: string[] = []

  for (let i = 0; i < SEARCH_QUERIES.length; i++) {
    const query = SEARCH_QUERIES[i]
    onProgress(`Search ${i + 1}/${SEARCH_QUERIES.length}: "${query.slice(0, 48)}..."`)
    try {
      const data = await postJson<{ results: { title: string; snippet: string; date?: string }[] }>(
        "/api/serp",
        { query, apiKey: serpKey },
      )
      const text = data.results
        .map((r) => `- ${r.title}${r.date ? ` (${r.date})` : ""}: ${r.snippet}`)
        .join("\n")
      if (text) chunks.push(`### Search: ${query}\n${text}`)
    } catch (e) {
      chunks.push(`### Search: ${query}\n(Search failed: ${e instanceof Error ? e.message : "error"})`)
    }
  }

  if (chunks.every((c) => c.includes("(Search failed"))) {
    throw new Error("All web searches failed. Check your SerpAPI key and monthly quota.")
  }

  return chunks.join("\n\n")
}

function buildOpinionPrompt(webContext: string): string {
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
  return `You are an experienced Indian equity analyst specializing in small-cap and penny stocks on NSE/BSE. Today is ${today}.

Below is fresh web research data about Indian penny stocks with short-term momentum:

${webContext}

TASK: From this data (plus your knowledge of Indian markets), identify the 3 penny stocks (typically under Rs 100, preferably under Rs 50) with the strongest setups for a 1-2 WEEK swing trade. Consider volume spikes, news catalysts, technical breakouts, sector momentum, and recent price history.

For EACH of your 3 candidates, output EXACTLY this format:

TICKER: [NSE/BSE symbol]
NAME: [company name]
EXPECTED_PROFIT: [realistic % in 1-2 weeks, e.g. 12%]
CATALYST: [one sentence on why it can move now]
RISK: [LOW / MEDIUM / HIGH]

Be realistic with profit estimates (penny stock swings are usually 5-30% in 2 weeks). Do not invent tickers - only use real listed Indian companies.`
}

function buildSynthesisPrompt(webContext: string, opinions: ModelOpinion[]): string {
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
  const opinionText = opinions
    .filter((o) => !o.error)
    .map((o) => `--- Analyst "${o.model}" says ---\n${o.content}`)
    .join("\n\n")

  return `You are the chief investment strategist at an Indian equity research desk. Today is ${today}.

You have TWO inputs:

INPUT 1 - Fresh web research on Indian penny stocks:
${webContext}

INPUT 2 - Independent picks from ${opinions.filter((o) => !o.error).length} AI analysts:
${opinionText || "(No analyst opinions available - rely on web research alone)"}

TASK: Synthesize everything. Weigh consensus (stocks multiple analysts picked), catalyst strength, volume evidence, and realistic upside. Select the TOP 1-2 Indian penny stocks with the highest probability of profit in a 1-2 WEEK window.

Respond with ONLY a valid JSON object (no markdown fences, no commentary) in exactly this shape:

{
  "picks": [
    {
      "ticker": "SYMBOL",
      "name": "Company Name",
      "currentPrice": "Rs XX approx",
      "expectedProfitPct": 15,
      "entry": "Rs XX-XX",
      "target": "Rs XX",
      "stopLoss": "Rs XX",
      "risk": "MEDIUM",
      "horizon": "1-2 weeks",
      "reasoning": "2-4 sentences explaining the thesis, history, and why now",
      "catalysts": ["catalyst 1", "catalyst 2"]
    }
  ],
  "candidates": [
    { "ticker": "SYMBOL", "name": "Company Name", "note": "one line on why it was considered but not picked" }
  ],
  "marketSummary": "2-3 sentences on the current Indian small-cap market mood",
  "disclaimer": "one line risk disclaimer"
}

Rules:
- "picks" must have 1 or 2 entries maximum, ranked best first.
- "candidates" lists 3-5 other stocks that were considered.
- expectedProfitPct must be a realistic number (5-30 typical).
- Only real, currently listed NSE/BSE companies.
- Output raw JSON only.`
}

export async function runGeminiOpinion(geminiKey: string, webContext: string): Promise<ModelOpinion> {
  try {
    const data = await postJson<{ text: string; model: string }>("/api/gemini", {
      prompt: buildOpinionPrompt(webContext),
      apiKey: geminiKey,
    })
    return { model: `Gemini (${data.model})`, content: data.text }
  } catch (e) {
    return { model: "Gemini", content: "", error: e instanceof Error ? e.message : "Failed" }
  }
}

export async function runOpenRouterOpinions(
  openrouterKey: string,
  webContext: string,
  onProgress: (detail: string) => void,
): Promise<ModelOpinion[]> {
  let models: { id: string; name: string }[] = []
  try {
    const data = await postJson<{ models: { id: string; name: string }[] }>("/api/openrouter", {
      action: "models",
      apiKey: openrouterKey,
    })
    models = data.models.slice(0, MAX_OPENROUTER_MODELS)
  } catch (e) {
    return [{ model: "OpenRouter", content: "", error: e instanceof Error ? e.message : "Failed to list models" }]
  }

  const prompt = buildOpinionPrompt(webContext)
  const opinions: ModelOpinion[] = []

  for (let i = 0; i < models.length; i++) {
    const model = models[i]
    onProgress(`Model ${i + 1}/${models.length}: ${model.name}`)
    try {
      if (i > 0) await sleep(2500) // respect free-tier rate limits
      const data = await postJson<{ text: string }>("/api/openrouter", {
        action: "chat",
        model: model.id,
        prompt,
        apiKey: openrouterKey,
      })
      opinions.push({ model: model.name, content: data.text })
    } catch (e) {
      opinions.push({ model: model.name, content: "", error: e instanceof Error ? e.message : "Skipped" })
    }
  }

  return opinions
}

function extractJson(text: string): ResearchReport {
  // Strip markdown fences if present
  let cleaned = text.trim()
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) cleaned = fenceMatch[1].trim()

  // Find first { ... last }
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start === -1 || end === -1) throw new Error("Could not parse the final report")
  cleaned = cleaned.slice(start, end + 1)

  const parsed = JSON.parse(cleaned)

  const picks: StockPick[] = (Array.isArray(parsed.picks) ? parsed.picks : []).slice(0, 2).map(
    (p: Record<string, unknown>) => ({
      ticker: String(p.ticker ?? "?"),
      name: String(p.name ?? ""),
      currentPrice: String(p.currentPrice ?? "N/A"),
      expectedProfitPct: Number(p.expectedProfitPct ?? 0),
      entry: String(p.entry ?? "N/A"),
      target: String(p.target ?? "N/A"),
      stopLoss: String(p.stopLoss ?? "N/A"),
      risk: String(p.risk ?? "MEDIUM").toUpperCase(),
      horizon: String(p.horizon ?? "1-2 weeks"),
      reasoning: String(p.reasoning ?? ""),
      catalysts: Array.isArray(p.catalysts) ? p.catalysts.map(String) : [],
    }),
  )

  if (picks.length === 0) throw new Error("The final report contained no stock picks")

  const candidates: Candidate[] = (Array.isArray(parsed.candidates) ? parsed.candidates : []).map(
    (c: Record<string, unknown>) => ({
      ticker: String(c.ticker ?? "?"),
      name: String(c.name ?? ""),
      note: String(c.note ?? ""),
    }),
  )

  return {
    picks,
    candidates,
    marketSummary: String(parsed.marketSummary ?? ""),
    disclaimer: String(
      parsed.disclaimer ?? "Penny stocks are extremely risky. This is AI-generated research, not financial advice.",
    ),
  }
}

export async function runSynthesis(
  keys: ApiKeys,
  webContext: string,
  opinions: ModelOpinion[],
): Promise<ResearchReport> {
  const prompt = buildSynthesisPrompt(webContext, opinions)

  // Prefer Gemini for the final structured synthesis; fall back to OpenRouter
  if (keys.gemini) {
    try {
      const data = await postJson<{ text: string }>("/api/gemini", { prompt, apiKey: keys.gemini })
      return extractJson(data.text)
    } catch {
      // fall through to OpenRouter
    }
  }

  if (keys.openrouter) {
    const data = await postJson<{ models: { id: string; name: string }[] }>("/api/openrouter", {
      action: "models",
      apiKey: keys.openrouter,
    })
    let lastError: Error | null = null
    for (const model of data.models.slice(0, 3)) {
      try {
        const res = await postJson<{ text: string }>("/api/openrouter", {
          action: "chat",
          model: model.id,
          prompt,
          apiKey: keys.openrouter,
        })
        return extractJson(res.text)
      } catch (e) {
        lastError = e instanceof Error ? e : new Error("Synthesis failed")
        await sleep(2000)
      }
    }
    throw lastError ?? new Error("Synthesis failed on all models")
  }

  throw new Error("Need at least a Gemini or OpenRouter key for the final synthesis")
}
