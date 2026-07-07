import { NextResponse } from "next/server"

export const maxDuration = 60

const FALLBACK_FREE_MODELS = [
  { id: "deepseek/deepseek-chat-v3-0324:free", name: "DeepSeek V3" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B" },
  { id: "qwen/qwen-2.5-72b-instruct:free", name: "Qwen 2.5 72B" },
  { id: "google/gemma-3-27b-it:free", name: "Gemma 3 27B" },
  { id: "mistralai/mistral-small-3.1-24b-instruct:free", name: "Mistral Small 3.1" },
]

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, apiKey } = body

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "Missing OpenRouter API key" }, { status: 400 })
    }

    if (action === "models") {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 20000)
        const res = await fetch("https://openrouter.ai/api/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: controller.signal,
        })
        clearTimeout(timeout)
        const data = await res.json()

        const models = (Array.isArray(data.data) ? data.data : [])
          .filter((m: { id?: string; pricing?: { prompt?: string; completion?: string } }) => {
            const promptPrice = Number.parseFloat(m.pricing?.prompt ?? "1")
            const completionPrice = Number.parseFloat(m.pricing?.completion ?? "1")
            return m.id?.endsWith(":free") || (promptPrice === 0 && completionPrice === 0)
          })
          .map((m: { id: string; name?: string; context_length?: number }) => ({
            id: m.id,
            name: m.name || m.id,
            contextLength: m.context_length ?? 0,
          }))
          // Prefer bigger-context models (usually stronger)
          .sort(
            (a: { contextLength: number }, b: { contextLength: number }) => b.contextLength - a.contextLength,
          )

        return NextResponse.json({ models: models.length > 0 ? models : FALLBACK_FREE_MODELS })
      } catch {
        return NextResponse.json({ models: FALLBACK_FREE_MODELS })
      }
    }

    if (action === "chat") {
      const { model, prompt } = body
      if (!model || !prompt) {
        return NextResponse.json({ error: "Missing model or prompt" }, { status: 400 })
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 50000)

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "StockScout India",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      const data = await res.json()

      if (!res.ok) {
        return NextResponse.json(
          { error: data?.error?.message || `OpenRouter HTTP ${res.status}` },
          { status: 502 },
        )
      }

      const text = data?.choices?.[0]?.message?.content
      if (!text) {
        return NextResponse.json({ error: "Model returned an empty response" }, { status: 502 })
      }

      return NextResponse.json({ text })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e) {
    const message = e instanceof Error ? e.message : "OpenRouter request failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
