"use client"

import { useState } from "react"
import type { ModelOpinion, ResearchReport } from "@/lib/types"

function riskColor(risk: string) {
  if (risk === "LOW") return "bg-gain/15 text-gain border-gain/30"
  if (risk === "HIGH") return "bg-loss/15 text-loss border-loss/30"
  return "bg-primary/15 text-primary border-primary/30"
}

export function ReportView({ report, opinions }: { report: ResearchReport; opinions: ModelOpinion[] }) {
  const [showOpinions, setShowOpinions] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      {report.marketSummary && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Market Pulse</h3>
          <p className="text-sm leading-relaxed text-card-foreground text-pretty">{report.marketSummary}</p>
        </div>
      )}

      {report.picks.map((pick, i) => (
        <article key={pick.ticker + i} className="overflow-hidden rounded-xl border border-primary/30 bg-card">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary px-2 py-0.5 font-mono text-xs font-black text-primary-foreground">
                {i === 0 ? "TOP PICK" : "PICK #2"}
              </span>
              <span className={`rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${riskColor(pick.risk)}`}>
                {pick.risk} RISK
              </span>
            </div>
            <span className="font-mono text-xs text-muted-foreground">{pick.horizon}</span>
          </div>

          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-foreground">{pick.ticker}</h2>
                <p className="text-sm text-muted-foreground">{pick.name}</p>
              </div>
              <div className="text-right">
                <div className="font-mono text-2xl font-black text-gain">+{pick.expectedProfitPct}%</div>
                <div className="text-xs text-muted-foreground">expected</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Price", value: pick.currentPrice },
                { label: "Entry", value: pick.entry },
                { label: "Target", value: pick.target },
                { label: "Stop Loss", value: pick.stopLoss },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-muted p-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item.label}</div>
                  <div className="mt-0.5 font-mono text-sm font-semibold text-foreground">{item.value}</div>
                </div>
              ))}
            </div>

            <p className="text-sm leading-relaxed text-card-foreground text-pretty">{pick.reasoning}</p>

            {pick.catalysts.length > 0 && (
              <div>
                <h4 className="mb-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Catalysts</h4>
                <ul className="flex flex-col gap-1">
                  {pick.catalysts.map((c, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm leading-relaxed text-card-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </article>
      ))}

      {report.candidates.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Also Considered ({report.candidates.length})
          </h3>
          <ul className="flex flex-col gap-3">
            {report.candidates.map((c, i) => (
              <li key={c.ticker + i} className="flex flex-col gap-0.5 border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-foreground">{c.ticker}</span>
                  <span className="text-xs text-muted-foreground">{c.name}</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{c.note}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {opinions.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <button
            type="button"
            onClick={() => setShowOpinions((s) => !s)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            aria-expanded={showOpinions}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              AI Analyst Opinions ({opinions.filter((o) => !o.error).length}/{opinions.length} responded)
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`text-muted-foreground transition-transform ${showOpinions ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {showOpinions && (
            <div className="flex flex-col gap-3 border-t border-border p-4">
              {opinions.map((o, i) => (
                <div key={o.model + i} className="rounded-lg bg-muted p-3">
                  <div className="mb-1.5 font-mono text-xs font-bold text-primary">{o.model}</div>
                  {o.error ? (
                    <p className="text-xs text-loss">Skipped: {o.error}</p>
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">
                      {o.content}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="rounded-lg border border-loss/20 bg-loss/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        {report.disclaimer}
      </p>
    </div>
  )
}
