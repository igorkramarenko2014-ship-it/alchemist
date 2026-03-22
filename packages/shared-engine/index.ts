/**
 * @alchemist/shared-engine — preset/state logic, AI triad, FXP encode.
 */
export type {
  AICandidate,
  AIAnalysis,
  Panelist,
  SerumState,
  UserMode,
} from "@alchemist/shared-types";

export {
  makeTriadFetcher,
  runTriad,
  stubPanelistCandidates,
  TRIAD_PANELISTS,
} from "./triad";
export {
  cosineSimilarityParamArrays,
  scoreCandidates,
  SLAVIC_FILTER_COSINE_THRESHOLD,
  slavicFilterDedupe,
  weightedScore,
} from "./score";
export {
  ADVERSARIAL_ENTROPY_MIN,
  ADVERSARIAL_VARIANCE_MIN,
  buildValidationSummary,
  candidatePassesAdversarial,
  candidatePassesDistributionGate,
  consensusValidateCandidate,
  entropyParamArray,
  filterConsensusValid,
  filterValid,
  getContextualEntropyThreshold,
  isValidCandidate,
  passesAdversarialSanity,
  passesDistributionGate,
  validateSerumParamArray,
  varianceParamArray,
} from "./validate";
export type { ConsensusValidationResult, ParamViolation } from "./validate";
export { encodeFxp } from "./encoder";
export { AI_TIMEOUT_MS, MAX_CANDIDATES, PANELIST_WEIGHTS } from "./constants";
export {
  TRIAD_PROMPT_MAX_CHARS,
  validatePromptForTriad,
} from "./prompt-guard";
export type { PromptGuardReason } from "./prompt-guard";
export { logEvent } from "./telemetry";
export {
  logTriadPanelistEnd,
  logTriadRunEnd,
  logTriadRunStart,
  newTriadRunId,
  nowMs,
  withTriadPanelistTiming,
} from "./triad-monitor";
export type { TriadPanelistStatus, TriadRunMode } from "./triad-monitor";
export {
  findTablebaseRecordForPrompt,
  lookupTablebaseCandidate,
} from "./reliability/checkers-fusion";
export type { TablebaseRecord } from "./reliability/tablebase-schema";
export { isTablebaseRecord } from "./reliability/tablebase-schema";
export { TABLEBASE_RECORDS } from "./reliability/tablebase-db";
export { computeSoeRecommendations } from "./soe";
export type { SoeRecommendations, SoeTriadSnapshot } from "./soe";
export {
  ALT_TRIAD_GOVERNANCE_WEIGHTS_EFFICIENCY,
  ATHENA_SOE_RECALIBRATION_LINE,
  computeTriadGovernance,
  DEFAULT_TRIAD_GOVERNANCE_WEIGHTS,
  PANELIST_ALCHEMIST_CODENAME,
  velocityScoreFromMeanPanelistMs,
} from "./triad-panel-governance";
export type {
  TriadGovernanceInput,
  TriadGovernanceResult,
  TriadPanelWeights,
} from "./triad-panel-governance";
export { logAthenaSoeRecalibration } from "./triad-monitor";
export {
  narrowTaxonomyPoolToTriadCandidates,
  type NarrowTaxonomyOptions,
  TaxonomyPoolTooLargeError,
  TAXONOMY_PRE_SLAVIC_POOL_MAX,
} from "./taxonomy/engine";
export {
  filterTaxonomyByPromptKeywords,
  rankTaxonomy,
  TAXONOMY_KEYWORD_SPARSE_MAX,
} from "./taxonomy/sparse-rank";
export { runTransparentArbitration } from "./arbitration/transparent-arbitration";
export type {
  ArbitrationContext,
  ArbitrationStageVote,
  ArbitrationStrategyId,
  TransparentArbitrationResult,
} from "./arbitration/types";
export {
  runCompliantPerfBoss,
  type CompliantPerfBossOptions,
  type CompliantPerfBossResult,
  type PerfBossCheck,
} from "./perf/compliant-perf-boss";
export {
  analyzeTalentMarket,
  getDefaultMarketBenchmarks,
  logTalentMarketAnalysis,
  parseMarketBenchmarksDocument,
} from "./talent/market-scout";
export type {
  MarketBenchmarksDocument,
  MarketTalentRow,
  TalentMarketAnalysisInput,
  TalentMarketAnalysisResult,
} from "./talent/market-scout";
export {
  logGreatLibraryMerge,
  mergeGreatLibraryIntoSoeSnapshot,
} from "./learning/great-library";
export type {
  GreatLibraryContext,
  GreatLibraryMergeResult,
} from "./learning/great-library";
export type {
  GreatLibraryOfflineJobMeta,
  GreatLibraryVectorDocument,
} from "./learning/offline-pipeline-types";
