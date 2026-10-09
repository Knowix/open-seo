import type { AiEngine } from "./ai-visibility";

/** Planning observations from the Treg catalog, October 9, 2026.
 * Google includes an allowance for async overview loading. Actual response
 * charge headers remain the source of truth; these are not spending caps.
 */
export function tregAiAnswerEstimate(engine: AiEngine) {
  return engine === "google_ai_overview" ? 0.008 : 0.004;
}
