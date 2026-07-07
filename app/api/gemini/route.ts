import { NextResponse } from "next/server"

export const maxDuration = 60

const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"]

export async function POST(request: Request) {
  try {
    const { prompt, apiKey } = await request.json()

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "Missing Gemini API key" }, { status: 400 })
    }
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 })
    }

    let lastError = "Gemini request failed"

    for (const model of MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 45000)

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
          }),
          signal: controller.signal,
        })
        clearTimeout(timeout)

        const data = await res.json()

        if (!res.ok) {
          lastError = data?.error?.message || `Gemini HTTP ${res.status}`
          // Try next model on rate limit / unavailable
          if (res.status === 429 || res.status === 503 || res.status === 404) continue
          return NextResponse.json({ error: lastError }, { status: 502 })
        }

        const text = data?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("")

        if (text) {
          return NextResponse.json({ text, model })
        }
        lastError = "Gemini returned an empty response"
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Gemini request failed"
      }
    }

    return NextResponse.json({ error: lastError }, { status: 502 })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gemini request failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
