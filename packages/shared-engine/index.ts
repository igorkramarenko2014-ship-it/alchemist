/**
 * @alchemist/shared-engine — preset/state logic, AI triad, FXP encode.
 */
export type {
  AICandidate,
  AIAnalysis,
  DecisionReceipt,
  DecisionReceiptRejectionReason,
  FxpExportProvenanceV1,
  Panelist,
  RealityGroundTruthAggregate,
  RealityTelemetryEventName,
  SerumState,
  TriadPanelistRunOutcome,
  TriadParityMode,
  TriadRunTelemetry,
  UserMode,
} from "@alchemist/shared-types";
export { REALITY_TELEMETRY_EVENTS } from "@alchemist/shared-types";

export {
  generateAIOMReceipt,
  generateDecisionReceipt,
} from "./explainability/decision-receipt";
export {
  flattenTriadChunksWithDurations,
  makeTriadFetcher,
  runTriad,
  stubPanelistCandidates,
  TRIAD_PANELISTS,
} from "./triad";
export type {
  InfluenceAjiStatus,
  InfluenceStatus,
  InfluenceTriadMode,
  LearningStatus,
  PriorsStatus,
  TriadFetcherContext,
  TriadPanelistChunk,
} from "./triad";
export {
  finalizeCandidates,
} from "./candidate-finalizer";
export type {
  CandidatePipelineState,
  CandidateRepairStage,
  CandidateScoringStage,
  FinalizeCandidatesOptions,
} from "./candidate-finalizer";
export {
  buildContrastConstraint,
  buildTriadPromptWithContrastConstraint,
  getRecentSlavicDropRate,
  inferDominantCharacteristic,
  recordTriadConstraintFeedback,
  __resetTriadConstraintInjectionStateForTests,
} from "./triad-constraint-injection";
export {
  DEFAULT_CREATIVE_CONFIG,
  creativePromptHash,
  getCreativeTelemetry,
  resetCreativeTelemetry,
  selectCreativeStance,
} from "./creative-diversity-layer";
export type {
  CreativeConfig,
  CreativeDecision,
  CreativeTelemetrySummary,
  CreativeStance,
} from "./creative-diversity-layer";
export {
  classifySignalOutcome,
  computePlfDecision,
  evaluateSignals,
  generateLowCostProbe,
} from "./power-logic-fusion";
export type {
  PlfClassification,
  PlfConfidence,
  PlfDecision,
  PlfProbe,
  PlfSignals,
} from "./power-logic-fusion";
export { detectCreativeResonance, detectRedZoneResonance, isMutedResponse } from "./arbitration/social-probe";
export { evaluateProbeResult } from "./probe-intelligence-layer";
export type { ProbeClassification, ProbeResult } from "./probe-intelligence-layer";
export {
  ONE_SEVENTEEN_CONSTANT,
  ONE_SEVENTEEN_SKILLS,
  oneSeventeenSeed,
  registerOneSeventeenRun,
} from "./one-seventeen-skills";
export type { OneSeventeenCounters, OneSeventeenSkill, OneSeventeenSnapshot } from "./one-seventeen-skills";
export { computeVibeMismatchPenalty, generate117Skills } from "./initiator/skills-117";
export type { InitiatorDomain, InitiatorSkill } from "./initiator/skills-117";
export {
  buildTriadParityHarnessRecord,
  diffTriadParitySnapshots,
  snapshotTriadAnalysis,
} from "./triad-parity-report";
export type { TriadParityDiffEntry, TriadParitySnapshot } from "./triad-parity-report";
export {
  corpusAffinityOrderChanged,
  computeTasteAffinity,
  cosineSimilarityParamArrays,
  intentBlendRankKey,
  scoreCandidates,
  scoreCandidatesWithGate,
  SLAVIC_FILTER_COSINE_THRESHOLD,
  slavicFilterDedupe,
  tasteAffinityOrderChanged,
  weightedScore,
} from "./score";
export type {
  CreativePivot,
  ScoreCandidatesGatedResult,
  ScoreCandidatesGateStatus,
  ScoreCandidatesOptions,
  TasteAffinityResult,
  TasteIndex,
} from "./score";
export {
  computeIntentAlignmentScore,
  paramTextureScore01,
  tokenSetJaccard,
  tokenizeForIntent,
} from "./intent-alignment";
export type { IntentAlignmentContext } from "./intent-alignment";
export {
  buildPresetQualityReport,
  PRESET_QUALITY_EVAL_CASES,
} from "./learning/preset-quality";
export type {
  PresetQualityCase,
  PresetQualityComparison,
  PresetQualityReport,
  PresetQualityReportSummary,
} from "./learning/preset-quality";
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
  assertNoAdvisoryMutationBridge,
  EXECUTION_TIER_NOTE,
  EXECUTION_TIER_REGISTRY,
  EXECUTION_TIER_VERSION,
  getExecutionTier,
  getExecutionTierEntry,
  isAdvisoryOnlyCell,
  isTier1,
  isTier2,
  isTier3,
  summarizeExecutionTiers,
} from "./execution-tiers";
export type {
  ExecutionRecommendation,
  ExecutionTier,
  ExecutionTierEntry,
  ExecutionTierRegistry,
  ExecutionTierSummary,
} from "./execution-tiers";
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
  getGateIntegrityFailure,
  isStrictSerumStateShape,
  MAX_PARAM_ARRAY_LENGTH,
  isDataPure,
  isTemporalFlowPure,
  isTelemetryPureFromCandidates,
  isTelemetryScoreSeriesPure,
  isValidCandidate,
  passesAdversarialSanity,
  passesDistributionGate,
  REASONING_MAX_CHARS,
  STATUS_NOISY,
  validateParamArrayStructuralIntegrity,
  validateReasoningStructure,
  validateSerumParamArray,
  varianceParamArray,
} from "./validate";
export type { ConsensusValidationResult, ParamViolation } from "./validate";
export { runGFUSCScenarios } from "./gfusc/runner-logic";
export {
  GFUSC_AGGREGATE_BURN_THRESHOLD,
  computeGFUSCHarmIndex,
  computeGFUSCVectorScore,
  evaluateGFUSCVerdict,
} from "./gfusc/verdict";
export type {
  GFUSCRunResult,
  GFUSCScenario,
  GFUSCScenarioSignal,
  GFUSCScenarioSource,
  GFUSCVectorScore,
  GFUSCVerdict,
} from "./gfusc/verdict";
export {
  sanitizeGFUSCSignalBundle,
} from "./gfusc/signals";
export type {
  DeploymentContext,
  DeploymentEnvironment,
  ExternalSignals,
  GFUSCSignalBundle,
  SanitizedGFUSCSignalBundle,
  UsageTopology,
} from "./gfusc/signals";
export {
  GFUSC_CRITICAL_VECTOR_IDS,
  GFUSC_DEFAULT_VECTOR_THRESHOLD,
  GFUSC_MAX_SCORE,
  GFUSC_SCHEMA_VERSION,
  GFUSC_VECTOR_DEFINITIONS,
  GFUSC_VECTOR_IDS,
  GFUSC_VECTOR_THRESHOLD_OVERRIDES,
  getGFUSCVectorDefinition,
} from "./gfusc/vectors";
export type {
  HarmVectorDefinition,
  HarmVectorFamily,
  HarmVectorId,
} from "./gfusc/vectors";
export { evaluateRisk } from "./risk-evaluator";
export type { RiskEvaluation, RiskLevel, SafetyEvent, SafetyEventCategory } from "./risk-evaluator";
export {
  acknowledgeSafetyRestriction,
  adminUnlockSafetyState,
  applyRiskEvaluation,
  createInitialSafetyState,
  DEFAULT_SAFETY_STATE_CONFIG,
  expireSafetyRestriction,
  formatRestrictedModeMessage,
  formatWarningMessage,
  RESTRICTED_MODE_MESSAGE_TEMPLATE,
  resolveSafetyStateConfig,
  USER_WARNING_MESSAGE_TEMPLATE,
} from "./safety-state";
export type {
  SafetyAuditAction,
  SafetyAuditEntry,
  SafetyRestrictionState,
  SafetyState,
  SafetyStateConfig,
  SafetyTransitionResult,
  SensitiveCapability,
} from "./safety-state";
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
  ALCHEMIST_FXP_PROVENANCE_SCHEMA,
  ALCHEMIST_FXP_PROVENANCE_VERSION,
  buildFxpExportProvenanceV1,
  buildFxpGateSummary,
  fxpProvenanceSidecarFilename,
  FXP_ENCODER_PROVENANCE_SURFACE,
  sha256HexUtf8,
} from "./fxp-provenance";
export type { BuildFxpProvenanceContext } from "./fxp-provenance";
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
export { JAILBREAK_MARKERS, validateTriadIntent } from "./intent-hardener";
export type {
  IntentHardenerReason,
  TriadIntentInput,
  TriadIntentValidationResult,
  ValidateTriadIntentOptions,
} from "./intent-hardener";
export { logEvent } from "./telemetry";
export { redactSensitive } from "./telemetry-redact";
export { logRealitySignal, sanitizeRealitySignalPayload } from "./reality-signals-log";
export {
  applyPnhTriadPromptDefense,
  auditTriadCandidatesForPnhResponseEcho,
  hashPromptForTelemetry,
  stripPromptJailbreakMarkers,
} from "./pnh/pnh-triad-defense";
export type {
  AuditPnhResponseEchoOptions,
  PnhTriadIntervention,
  PnhTriadInterventionType,
  PnhTriadPromptDefenseResult,
} from "./pnh/pnh-triad-defense";
export {
  logTriadPanelistEnd,
  logTriadRunEnd,
  logTriadRunStart,
  newTriadRunId,
  nowMs,
  withTriadPanelistTiming,
} from "./triad-monitor";
export type {
  TriadPanelistStatus,
  TriadRunLearningContextUsed,
  TriadRunMode,
} from "./triad-monitor";
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
  PANELIST_DNA_SEED,
  panelistDnaText,
  triadPanelistSystemPrompt,
} from "./triad-panelist-prompt";
export {
  narrowTaxonomyPoolToTriadCandidates,
  TaxonomyPoolTooLargeError,
  TAXONOMY_PRE_SLAVIC_POOL_MAX,
} from "./taxonomy/engine";
export {
  filterTaxonomyByPromptKeywords,
  rankTaxonomy,
  TAXONOMY_KEYWORD_SPARSE_MAX,
} from "./taxonomy/sparse-rank";
export {
  safeProcessTaxonomy,
} from "./taxonomy/safe-process";
export type {
  SafeTaxonomyProcessResult,
  TaxonomyProcessMode,
} from "./taxonomy/safe-process";
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
export {
  collectLeafParamPaths,
  computeCorpusAffinity,
  ENGINE_SCHOOL_CONTEXT_ADVISORY_LINE,
  ENGINE_SCHOOL_CONTEXT_DESCRIPTIVE_LINE,
  buildLearningContext,
  selectLessonsForPrompt,
} from "./learning/index";
export type {
  LearningIndex,
  LearningIndexLesson,
  LearningLesson,
  SelectedLesson,
  SelectLessonsOptions,
} from "./learning/index";
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
export { PNH_PROMPT_DEFENSE_MARKERS, PNH_SCENARIOS } from "./pnh/pnh-scenarios";
export type { PnhScenario, PnhScenarioId, PnhSeverity } from "./pnh/pnh-scenarios";
export { runPnhGhostWar } from "./pnh/pnh-ghost-run";
export type {
  ImmunityReport,
  PnhProbeOutcome,
  PnhProbeResult,
  PnhScenarioResult,
} from "./pnh/pnh-ghost-run";
export { runPnhModelWarfare } from "./pnh/pnh-warfare-model";
export type {
  HardGateWarfareHooks,
  PnhWarfareReport,
  WarfareCategory,
  WarfareOutcome,
  WarfareSequenceResult,
  WarfareTargetFilter,
} from "./pnh/pnh-warfare-model";
export {
  getPnhAptScenarioById,
  PNH_APT_SCENARIO_CATALOG,
} from "./pnh/pnh-apt-scenarios";
export type {
  AptDefenseLayer,
  AptImplementationStatus,
  PnhAptScenario,
} from "./pnh/pnh-apt-scenarios";
export { detectPnhAptPromptMatches } from "./pnh/pnh-apt-prompt-scan";
export {
  checkTriadRateLimitCore,
  triadRateLimitConfigFromEnv,
  __resetTriadRateLimitCoreForTests,
} from "./pnh/triad-rate-limit-core";
export type {
  TriadRateLimitConfig,
  TriadRateLimitCoreResult,
} from "./pnh/triad-rate-limit-core";
export type {
  PnhAdaptiveAction,
  PnhContextEvaluation,
  PnhContextInput,
  PnhEnvironmentClass,
  PnhRiskLevel,
  PnhTriadLane,
  PnhVerifyMode,
} from "./pnh/pnh-context-types";
export { evaluatePnhContext, pnhContextFragilityScore } from "./pnh/pnh-context-evaluator";
export {
  pnhAdaptiveDecision,
  pnhAdaptiveScenarioDecision,
  triadApiPnhLaneFromEnv,
} from "./pnh/pnh-adaptive";
export type { TriadIntentGuardResult } from "./pnh/pnh-adaptive";
export {
  buildPnhHealthContextInput,
  buildPnhHealthSnapshot,
} from "./pnh/pnh-health-snapshot";
export {
  escalationLevelToActionFloor,
  getDefaultPnhAttackMemoryStore,
  intentReasonToPnhMemoryScenarioKey,
  maxPnhAdaptiveAction,
  PnhAttackMemoryStore,
  resetPnhAttackMemoryForTests,
} from "./pnh/pnh-attack-memory";
export type {
  PnhAttackEvent,
  PnhAttackSurface,
  PnhDetectedPattern,
  PnhEscalationLevel,
  PnhMemoryInspection,
  PnhMemoryScenarioKey,
  PnhSessionStateSnapshot,
} from "./pnh/pnh-attack-memory";
export {
  pnhIntentFailureDecisionWithMemory,
} from "./pnh/pnh-decision-with-memory";
export type { PnhDecisionWithMemory } from "./pnh/pnh-decision-with-memory";
export {
  buildPnhSimulationReport,
  comparePnhFingerprints,
  fingerprintFromApt,
  fingerprintFromIntentStubRow,
  fingerprintsFromGhost,
  fingerprintsFromWarfare,
  isOperationalPnhFingerprintKey,
  isPnhPipelineBreachRow,
} from "./pnh/pnh-simulation-engine";
export type {
  PnhFingerprintOutcome,
  PnhSimulationBaselineFile,
  PnhSimulationDiff,
  PnhSimulationExpectation,
  PnhSimulationPnhStatus,
  PnhSimulationReport,
  PnhSimulationRow,
} from "./pnh/pnh-simulation-engine";
export { parseLegacySoeHintMessage } from "./soe-hint-structured";
export { resolveTransmutation } from "./transmutation/transmutation-runner-logic";
export { PolicyFamily } from "./transmutation/transmutation-types";
export type { TransmutationResult, TransmutationProfile } from "./transmutation/transmutation-types";
export type { StructuredSoeHint, StructuredSoeSeverity } from "./soe-hint-structured";
export { getPersonaContextAugmentation } from "./personas/persona-context";
export type { PersonaAugmentation } from "./personas/persona-context";
