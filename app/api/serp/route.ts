import { NextResponse } from "next/server"

export const maxDuration = 60

interface SerpResult {
  title: string
  snippet: string
  link: string
  date?: string
}

export async function POST(request: Request) {
  try {
    const { query, apiKey } = await request.json()

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "Missing SerpAPI key" }, { status: 400 })
    }
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing query" }, { status: 400 })
    }

    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&hl=en&gl=in&num=10&api_key=${encodeURIComponent(apiKey)}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    const data = await res.json()

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 502 })
    }

    const results: SerpResult[] = []

    if (Array.isArray(data.organic_results)) {
      for (const item of data.organic_results.slice(0, 8)) {
        results.push({
          title: item.title ?? "",
          snippet: item.snippet ?? "",
          link: item.link ?? "",
          date: item.date,
        })
      }
    }

    if (Array.isArray(data.news_results)) {
      for (const item of data.news_results.slice(0, 5)) {
        results.push({
          title: item.title ?? "",
          snippet: item.snippet ?? "",
          link: item.link ?? "",
          date: item.date,
        })
      }
    }

    return NextResponse.json({ results })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
