"use client"

import type { ResearchRun } from "@/lib/types"

export function HistoryPanel({
  history,
  onSelect,
  onDelete,
}: {
  history: ResearchRun[]
  onSelect: (run: ResearchRun) => void
  onDelete: (id: string) => void
}) {
  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No research runs yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">Past reports are saved on this device automatically.</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {history.map((run) => {
        const top = run.report.picks[0]
        const date = new Date(run.timestamp)
        return (
          <li key={run.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <button
              type="button"
              onClick={() => onSelect(run)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors active:bg-muted"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-foreground">{top?.ticker ?? "?"}</span>
                  {run.report.picks[1] && (
                    <span className="font-mono text-xs text-muted-foreground">+ {run.report.picks[1].ticker}</span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}{" "}
                  {date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  {top?.name ? ` — ${top.name}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {top && <span className="font-mono text-sm font-bold text-gain">+{top.expectedProfitPct}%</span>}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(run.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation()
                      onDelete(run.id)
                    }
                  }}
                  aria-label="Delete this run"
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-loss"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" />
                  </svg>
                </span>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
