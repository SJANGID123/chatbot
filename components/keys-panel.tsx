"use client"

import { useState } from "react"
import type { ApiKeys } from "@/lib/types"
import { clearKeys, saveKeys } from "@/lib/storage"

const FIELDS: { id: keyof ApiKeys; label: string; hint: string; href: string }[] = [
  {
    id: "serp",
    label: "SerpAPI Key",
    hint: "Free tier: 100 searches/month",
    href: "https://serpapi.com/manage-api-key",
  },
  {
    id: "gemini",
    label: "Gemini API Key",
    hint: "Free tier from Google AI Studio",
    href: "https://aistudio.google.com/apikey",
  },
  {
    id: "openrouter",
    label: "OpenRouter API Key",
    hint: "Free models available with any key",
    href: "https://openrouter.ai/keys",
  },
]

export function KeysPanel({
  keys,
  onKeysChange,
}: {
  keys: ApiKeys
  onKeysChange: (keys: ApiKeys) => void
}) {
  const [draft, setDraft] = useState<ApiKeys>(keys)
  const [saved, setSaved] = useState(false)
  const [visible, setVisible] = useState<Record<string, boolean>>({})

  function handleSave() {
    const trimmed: ApiKeys = {
      serp: draft.serp.trim(),
      gemini: draft.gemini.trim(),
      openrouter: draft.openrouter.trim(),
    }
    saveKeys(trimmed)
    onKeysChange(trimmed)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleClear() {
    if (!confirm("Remove all API keys from this device?")) return
    clearKeys()
    const empty = { serp: "", gemini: "", openrouter: "" }
    setDraft(empty)
    onKeysChange(empty)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold text-foreground">API Keys</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Keys are stored only in this device&apos;s browser storage (localStorage). They never leave your device except
          to call the respective APIs. You need SerpAPI for web research, plus at least one of Gemini or OpenRouter.
        </p>
      </div>

      {FIELDS.map((field) => (
        <div key={field.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`key-${field.id}`} className="text-sm font-semibold text-foreground">
              {field.label}
            </label>
            <a
              href={field.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-primary underline underline-offset-2"
            >
              Get key
            </a>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{field.hint}</p>
          <div className="mt-2 flex gap-2">
            <input
              id={`key-${field.id}`}
              type={visible[field.id] ? "text" : "password"}
              value={draft[field.id]}
              onChange={(e) => setDraft((d) => ({ ...d, [field.id]: e.target.value }))}
              placeholder="Paste key here"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-border bg-muted px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => ({ ...v, [field.id]: !v[field.id] }))}
              className="shrink-0 rounded-lg border border-border bg-muted px-3 text-xs font-semibold text-muted-foreground"
              aria-label={visible[field.id] ? `Hide ${field.label}` : `Show ${field.label}`}
            >
              {visible[field.id] ? "Hide" : "Show"}
            </button>
          </div>
          {keys[field.id] && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-gain">
              <span className="h-1.5 w-1.5 rounded-full bg-gain" aria-hidden="true" />
              Key saved on this device
            </p>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-opacity active:opacity-80"
        >
          {saved ? "Saved" : "Save Keys"}
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-loss"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
