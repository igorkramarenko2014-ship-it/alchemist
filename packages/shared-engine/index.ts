/**
 * @alchemist/shared-engine — preset/state logic, AI triad, FXP encode.
 */
export type {
  AICandidate,
  AIAnalysis,
  Panelist,
  SerumState,
  TriadRunTelemetry,
  UserMode,
} from "@alchemist/shared-types";

export {
  flattenTriadChunksWithDurations,
  makeTriadFetcher,
  runTriad,
  stubPanelistCandidates,
  TRIAD_PANELISTS,
} from "./triad";
export type { TriadPanelistChunk } from "./triad";
export {
  cosineSimilarityParamArrays,
  intentBlendRankKey,
  scoreCandidates,
  scoreCandidatesWithGate,
  SLAVIC_FILTER_COSINE_THRESHOLD,
  slavicFilterDedupe,
  weightedScore,
} from "./score";
export type {
  CreativePivot,
  ScoreCandidatesGatedResult,
  ScoreCandidatesGateStatus,
  ScoreCandidatesOptions,
} from "./score";
export {
  computeIntentAlignmentScore,
  paramTextureScore01,
  tokenSetJaccard,
  tokenizeForIntent,
} from "./intent-alignment";
export type { IntentAlignmentContext } from "./intent-alignment";
export {
  adminWipeMess,
  ajiCompressionRatio,
  conceptualDensity,
  extractInferredCore,
  runAjiCrystallization,
  thresholdLimitExceeded,
  tokenizeWords,
} from "./aji-logic";
export type { GameChanger } from "./aji-logic";
export {
  ENTROPY_MESS_MAX_CHARS,
  ENTROPY_MESS_MAX_LINES,
  ENTROPY_POOL,
  generateEntropy,
  mulberry32,
} from "./entropy";
export {
  getSegmentCosineThreshold,
  getSegmentEntropyFloor,
  inferGateSegment,
  slavicCosineThresholdForPrompt,
} from "./gates";
export type { GateSegment } from "./gates";
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
  GATEKEEPER_IQR_K,
  GATEKEEPER_MIN_DURATION_MS,
  GATEKEEPER_MIN_SAMPLES,
  GATEKEEPER_WINDOW,
  GATEKEEPER_Z_MAX,
  getContextualEntropyThreshold,
  isDataPure,
  isTemporalFlowPure,
  isTelemetryPureFromCandidates,
  isTelemetryScoreSeriesPure,
  isValidCandidate,
  passesAdversarialSanity,
  passesDistributionGate,
  STATUS_NOISY,
  validateSerumParamArray,
  varianceParamArray,
} from "./validate";
export type { ConsensusValidationResult, ParamViolation } from "./validate";
export {
  getIntegrityHealthSnapshot,
  logDegradedFallback,
  logHonestCapabilityGap,
  logIntegrityEvent,
  logSprintComplete,
  resetIntegrityMetricsForTests,
} from "./integrity";
export type {
  IntegrityHealthSnapshot,
  IntegrityLogPayload,
  IntegrityOutcome,
} from "./integrity";
export {
  computeExistentialWeight,
  concludeModuleSprint,
  Polarity,
  SCHISM_DEFAULT_GROWTH_THRESHOLD,
  SCHISM_MODULE_GATEKEEPER,
  SCHISM_TENSION_BAND,
  triggerGatekeeperSchism,
  triggerSchism,
} from "./schism";
export type { ExistentialChoice, ModuleState } from "./schism";
export { encodeFxp } from "./encoder";
export {
  AI_TIMEOUT_MS,
  MAX_CANDIDATES,
  PANELIST_WEIGHTS,
  TRIAD_PANELIST_CLIENT_TIMEOUT_MS,
} from "./constants";
export {
  TRIAD_PROMPT_MAX_CHARS,
  validatePromptForTriad,
} from "./prompt-guard";
export type { PromptGuardReason } from "./prompt-guard";
export { validateTriadIntent } from "./intent-hardener";
export type { IntentHardenerReason, TriadIntentInput } from "./intent-hardener";
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
export { fingerprintPromptNormalized } from "./reliability/prompt-fingerprint";
export type { TablebaseRecord } from "./reliability/tablebase-schema";
export { isTablebaseRecord } from "./reliability/tablebase-schema";
export { TABLEBASE_RECORDS } from "./reliability/tablebase-db";
export {
  computeSoeRecommendations,
  logSoeHintWithIomContext,
  logSoeIomContext,
  logSoeIomFusion,
} from "./soe";
export type {
  SoeFusionHintCode,
  SoeRecommendations,
  SoeRecommendationsContext,
  SoeTriadSnapshot,
} from "./soe";
export {
  getAffectedIomCellsFromSchismCodes,
  IOM_SCHISM_AFFECTED_CELLS,
} from "./iom-schism-impact";
export { BRAIN_FUSION_CALIBRATION_VERSION } from "./brain-fusion-calibration.gen";
export { IGOR_SHARED_ENGINE_POWER_CELLS_GEN } from "./igor-orchestrator-cells.gen";
export { IGOR_ORCHESTRATOR_PACKAGES_GEN } from "./igor-orchestrator-packages.gen";
export {
  getIgorOrchestratorManifest,
  IGOR_APEX_STANCE_REF,
  IGOR_ORCHESTRATOR_LAYER_VERSION,
  IOM_POLICY_CELL_MAX,
  IGOR_SHARED_ENGINE_POWER_CELLS,
  logIgorOrchestratorManifest,
  logIomSelfHealProposal,
} from "./igor-orchestrator-layer";
export {
  detectSchisms,
  digestIgorManifestForPulse,
  getIOMCoverageReport,
  getIOMHealthPulse,
  IOM_CELL_VITEST_MAP,
  IOM_PULSE_VERSION,
} from "./iom-pulse";
export type {
  IOMManifestDigest,
  IOMCoverageReport,
  IOMHealthPulseResult,
  IOMPulseInput,
  IomPulseTriadFlags,
  IomSchismFinding,
  IomSchismSeverity,
  IomSuggestion,
} from "./iom-pulse";
export {
  getVstWrapperPulseSlice,
  recordVstWrapperPulseHint,
  resetVstWrapperPulseForTests,
  setVstWrapperDaemonRunning,
  setVstWrapperStance,
  setVstWrapperWatchFolder,
} from "./vst-wrapper-pulse";
export type {
  VstWrapperLoadResult,
  VstWrapperStance,
  VstWrapperStatusPulse,
} from "./vst-wrapper-pulse";
export {
  getVstObserverPulseSlice,
  getVstObserverStance,
  recordVstObserverSync,
  resetVstObserverStateForTests,
  setVstObserverStance,
} from "./vst-observer";
export type {
  VstObserverConfig,
  VstObserverStance,
  VstSyncResult,
  VstSyncStatusPulse,
} from "./vst-observer";
export {
  drainSurgicalRepairSchisms,
  performSurgicalRepair,
  repairAndPushToVst,
  resetSurgicalRepairStateForTests,
} from "./surgical-repair";
export type {
  RepairOptions,
  RepairResult,
  SurgicalRepairSchismPulse,
} from "./surgical-repair";
export type {
  IgorOrchestratorManifest,
  IgorOrchestratorPackagePower,
  IgorOrchestratorPowerCell,
  IomSelfHealProposalPayload,
} from "./igor-orchestrator-layer";
export {
  ARBITRATION_AGENT_AJI_FUSION_LINES,
  computeAgentAjiChatFusionFromTriadTelemetry,
  computeHealthAgentAjiChatFusion,
  computeMobileShellAgentAjiChatFusion,
  computeTalentAgentAjiChatFusion,
  mergeSoeWithAjiChat,
  taxonomyPoolTooLargeAgentFusion,
} from "./agent-fusion";
export type { AgentAjiChatFusion } from "./agent-fusion";
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
  PANELIST_DNA,
  panelistDnaText,
  triadPanelistSystemPrompt,
} from "./triad-panelist-prompt";
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
  computeGreatLibraryAgentAjiChatFusion,
  logGreatLibraryMerge,
  mergeGreatLibraryIntoSoeSnapshot,
} from "./learning/great-library";
export type {
  GreatLibraryContext,
  GreatLibraryMergeLogOptions,
  GreatLibraryMergeResult,
} from "./learning/great-library";
export type {
  GreatLibraryOfflineJobMeta,
  GreatLibraryVectorDocument,
} from "./learning/offline-pipeline-types";
export {
  computeEngineValuationHeuristic,
  ENGINE_VALUATION_HEURISTIC_VERSION,
} from "./engine-valuation-heuristic";
export type {
  EnginePackageMetrics,
  EngineValuationHeuristicResult,
  PackageLocBreakdown,
} from "./engine-valuation-heuristic";
export {
  TriadCircuitBreaker,
  withTriadCircuitBreaker,
} from "./circuit-breaker";
export type {
  CircuitBreakerPhase,
  TriadCircuitBreakerConfig,
} from "./circuit-breaker";
export { parseLegacySoeHintMessage } from "./soe-hint-structured";
export type {
  StructuredSoeHint,
  StructuredSoeSeverity,
} from "./soe-hint-structured";
