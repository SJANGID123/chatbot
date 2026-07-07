"use client"

import { useEffect, useState } from "react"
import type { ApiKeys, ModelOpinion, PipelineStep, ResearchReport, ResearchRun } from "@/lib/types"
import { loadHistory, loadKeys, deleteRun, saveRun } from "@/lib/storage"
import { runGeminiOpinion, runOpenRouterOpinions, runSynthesis, runWebResearch } from "@/lib/pipeline"
import { PipelineProgress } from "./pipeline-progress"
import { ReportView } from "./report-view"
import { KeysPanel } from "./keys-panel"
import { HistoryPanel } from "./history-panel"

type Tab = "scan" | "history" | "keys"

const INITIAL_STEPS: PipelineStep[] = [
  { id: "search", label: "Web Research (SerpAPI)", detail: "Scan Indian market news and screeners", status: "pending" },
  { id: "gemini", label: "Gemini Analysis", detail: "Deep analysis of candidates", status: "pending" },
  { id: "openrouter", label: "OpenRouter Free Models", detail: "Independent second opinions", status: "pending" },
  { id: "synthesis", label: "Final Synthesis", detail: "Rank and pick the top 1-2 stocks", status: "pending" },
]

export function StockScoutApp() {
  const [tab, setTab] = useState<Tab>("scan")
  const [keys, setKeys] = useState<ApiKeys>({ serp: "", gemini: "", openrouter: "" })
  const [history, setHistory] = useState<ResearchRun[]>([])
  const [hydrated, setHydrated] = useState(false)

  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState<PipelineStep[]>(INITIAL_STEPS)
  const [report, setReport] = useState<ResearchReport | null>(null)
  const [opinions, setOpinions] = useState<ModelOpinion[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setKeys(loadKeys())
    setHistory(loadHistory())
    setHydrated(true)
  }, [])

  const keysReady = Boolean(keys.serp && (keys.gemini || keys.openrouter))

  function updateStep(id: string, patch: Partial<PipelineStep>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  async function startResearch() {
    if (!keysReady || running) return
    setRunning(true)
    setError(null)
    setReport(null)
    setOpinions([])
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" })))

    try {
      // Step 1: Web research
      updateStep("search", { status: "running" })
      const webContext = await runWebResearch(keys.serp, (detail) => updateStep("search", { detail }))
      updateStep("search", { status: "done", detail: "Live market data collected" })

      const collected: ModelOpinion[] = []

      // Step 2: Gemini
      if (keys.gemini) {
        updateStep("gemini", { status: "running", detail: "Analyzing candidates..." })
        const op = await runGeminiOpinion(keys.gemini, webContext)
        collected.push(op)
        updateStep("gemini", {
          status: op.error ? "error" : "done",
          detail: op.error ? `Skipped: ${op.error}` : "Analysis complete",
        })
      } else {
        updateStep("gemini", { status: "done", detail: "Skipped (no key)" })
      }

      // Step 3: OpenRouter waterfall
      if (keys.openrouter) {
        updateStep("openrouter", { status: "running", detail: "Fetching free model list..." })
        const ops = await runOpenRouterOpinions(keys.openrouter, webContext, (detail) =>
          updateStep("openrouter", { detail }),
        )
        collected.push(...ops)
        const ok = ops.filter((o) => !o.error).length
        updateStep("openrouter", {
          status: ok > 0 ? "done" : "error",
          detail: `${ok}/${ops.length} models responded`,
        })
      } else {
        updateStep("openrouter", { status: "done", detail: "Skipped (no key)" })
      }

      setOpinions(collected)

      if (collected.filter((o) => !o.error).length === 0 && !keys.gemini && !keys.openrouter) {
        throw new Error("No AI model produced an analysis. Check your Gemini/OpenRouter keys.")
      }

      // Step 4: Synthesis
      updateStep("synthesis", { status: "running", detail: "Cross-referencing all opinions..." })
      const finalReport = await runSynthesis(keys, webContext, collected)
      updateStep("synthesis", { status: "done", detail: `Top pick: ${finalReport.picks[0]?.ticker}` })

      setReport(finalReport)

      const run: ResearchRun = {
        id: `run_${Date.now()}`,
        timestamp: Date.now(),
        report: finalReport,
        opinions: collected,
      }
      setHistory(saveRun(run))
    } catch (e) {
      const message = e instanceof Error ? e.message : "Research failed"
      setError(message)
      setSteps((prev) => prev.map((s) => (s.status === "running" ? { ...s, status: "error", detail: message } : s)))
    } finally {
      setRunning(false)
    }
  }

  function handleSelectRun(run: ResearchRun) {
    setReport(run.report)
    setOpinions(run.opinions)
    setError(null)
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "done", detail: "" })))
    setTab("scan")
  }

  function handleDeleteRun(id: string) {
    setHistory(deleteRun(id))
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-mono text-sm font-black text-primary-foreground">
              S
            </span>
            <div>
              <h1 className="text-sm font-black tracking-tight text-foreground">StockScout India</h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                AI Penny Stock Research
              </p>
            </div>
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold ${
              keysReady ? "border-gain/30 bg-gain/10 text-gain" : "border-loss/30 bg-loss/10 text-loss"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${keysReady ? "bg-gain" : "bg-loss"}`} aria-hidden="true" />
            {keysReady ? "READY" : "KEYS NEEDED"}
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">
        {tab === "scan" && (
          <div className="flex flex-col gap-4">
            {!keysReady && hydrated && (
              <button
                type="button"
                onClick={() => setTab("keys")}
                className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-left"
              >
                <p className="text-sm font-semibold text-primary">Setup required</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Add your SerpAPI key and at least one AI key (Gemini or OpenRouter) to start. Tap here to open
                  settings.
                </p>
              </button>
            )}

            <button
              type="button"
              onClick={startResearch}
              disabled={!keysReady || running}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-sm font-black uppercase tracking-wider text-primary-foreground transition-opacity active:opacity-80 disabled:opacity-40"
            >
              {running ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                  </svg>
                  Researching...
                </>
              ) : (
                "Find Top Penny Stocks"
              )}
            </button>

            <p className="text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              1-2 week horizon · NSE / BSE · Multi-model consensus
            </p>

            {(running || steps.some((s) => s.status !== "pending")) && (
              <div className="rounded-xl border border-border bg-card p-4">
                <PipelineProgress steps={steps} />
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-loss/30 bg-loss/5 p-4">
                <p className="text-sm font-semibold text-loss">Research failed</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{error}</p>
              </div>
            )}

            {report && <ReportView report={report} opinions={opinions} />}
          </div>
        )}

        {tab === "history" && <HistoryPanel history={history} onSelect={handleSelectRun} onDelete={handleDeleteRun} />}

        {tab === "keys" && <KeysPanel keys={keys} onKeysChange={setKeys} />}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex max-w-2xl">
          {(
            [
              { id: "scan", label: "Research" },
              { id: "history", label: "History" },
              { id: "keys", label: "Keys" },
            ] as { id: Tab; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
              className={`flex-1 py-4 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
                tab === item.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
