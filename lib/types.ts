export interface ApiKeys {
  serp: string
  gemini: string
  openrouter: string
}

export interface StockPick {
  ticker: string
  name: string
  currentPrice: string
  expectedProfitPct: number
  entry: string
  target: string
  stopLoss: string
  risk: "LOW" | "MEDIUM" | "HIGH" | string
  horizon: string
  reasoning: string
  catalysts: string[]
}

export interface Candidate {
  ticker: string
  name: string
  note: string
}

export interface ModelOpinion {
  model: string
  content: string
  error?: string
}

export interface ResearchReport {
  picks: StockPick[]
  candidates: Candidate[]
  marketSummary: string
  disclaimer: string
}

export interface ResearchRun {
  id: string
  timestamp: number
  report: ResearchReport
  opinions: ModelOpinion[]
}

export type StepStatus = "pending" | "running" | "done" | "error"

export interface PipelineStep {
  id: string
  label: string
  detail: string
  status: StepStatus
}
