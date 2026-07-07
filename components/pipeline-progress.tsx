"use client"

import type { PipelineStep } from "@/lib/types"

function StepIcon({ status }: { status: PipelineStep["status"] }) {
  if (status === "done") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gain/15 text-gain">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }
  if (status === "running") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
        </svg>
      </span>
    )
  }
  if (status === "error") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-loss/15 text-loss">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </span>
    )
  }
  return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted" />
}

export function PipelineProgress({ steps }: { steps: PipelineStep[] }) {
  return (
    <ol className="flex flex-col gap-0" aria-label="Research pipeline progress">
      {steps.map((step, i) => (
        <li key={step.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <StepIcon status={step.status} />
            {i < steps.length - 1 && (
              <span className={`w-px flex-1 ${step.status === "done" ? "bg-gain/40" : "bg-border"}`} />
            )}
          </div>
          <div className="flex flex-col gap-0.5 pb-5">
            <span
              className={`text-sm font-semibold ${
                step.status === "running"
                  ? "text-primary"
                  : step.status === "done"
                    ? "text-foreground"
                    : step.status === "error"
                      ? "text-loss"
                      : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
            {step.detail && <span className="font-mono text-xs leading-relaxed text-muted-foreground">{step.detail}</span>}
          </div>
        </li>
      ))}
    </ol>
  )
}
