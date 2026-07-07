"use client"

import type { ApiKeys, ResearchRun } from "./types"

const KEYS_STORAGE = "stockscout_api_keys"
const HISTORY_STORAGE = "stockscout_history"
const MAX_HISTORY = 20

export function loadKeys(): ApiKeys {
  if (typeof window === "undefined") return { serp: "", gemini: "", openrouter: "" }
  try {
    const raw = localStorage.getItem(KEYS_STORAGE)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        serp: parsed.serp ?? "",
        gemini: parsed.gemini ?? "",
        openrouter: parsed.openrouter ?? "",
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return { serp: "", gemini: "", openrouter: "" }
}

export function saveKeys(keys: ApiKeys) {
  localStorage.setItem(KEYS_STORAGE, JSON.stringify(keys))
}

export function clearKeys() {
  localStorage.removeItem(KEYS_STORAGE)
}

export function loadHistory(): ResearchRun[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE)
    if (raw) return JSON.parse(raw) as ResearchRun[]
  } catch {
    // ignore corrupt storage
  }
  return []
}

export function saveRun(run: ResearchRun): ResearchRun[] {
  const history = loadHistory()
  const updated = [run, ...history].slice(0, MAX_HISTORY)
  try {
    localStorage.setItem(HISTORY_STORAGE, JSON.stringify(updated))
  } catch {
    // storage full — drop oldest entries and retry once
    const trimmed = updated.slice(0, 5)
    try {
      localStorage.setItem(HISTORY_STORAGE, JSON.stringify(trimmed))
    } catch {
      // give up silently
    }
    return trimmed
  }
  return updated
}

export function deleteRun(id: string): ResearchRun[] {
  const updated = loadHistory().filter((r) => r.id !== id)
  localStorage.setItem(HISTORY_STORAGE, JSON.stringify(updated))
  return updated
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_STORAGE)
}
