export type DeploymentEnvironment = "prod" | "dev" | "test";

export type DeploymentContext = {
  operatorId: string;
  environment: DeploymentEnvironment;
  apiConsumerScope: string[];
  licensingDomain: string;
};

export type UsageTopology = {
  triadCallPattern: string[];
  queryStructureHash: string;
  outputRoutingTargets: string[];
};

export type ExternalSignals = {
  licensingScopeAssertions: string[];
  domainCategoryFlags: string[];
};

export type GFUSCSignalBundle = {
  deployment: DeploymentContext;
  usage: UsageTopology;
  external: ExternalSignals;
  capturedAtUtc: string;
};

export type SanitizedGFUSCSignalBundle = {
  deployment: {
    environment: DeploymentEnvironment;
    apiConsumerScopeCount: number;
    licensingDomainPresent: boolean;
    operatorIdPresent: boolean;
  };
  usage: {
    triadCallPatternCount: number;
    queryStructureHashPresent: boolean;
    outputRoutingTargetsCount: number;
  };
  external: {
    licensingScopeAssertionsCount: number;
    domainCategoryFlagsCount: number;
  };
  capturedAtUtc: string;
};

export function sanitizeGFUSCSignalBundle(
  bundle: GFUSCSignalBundle,
): SanitizedGFUSCSignalBundle {
  return {
    deployment: {
      environment: bundle.deployment.environment,
      apiConsumerScopeCount: bundle.deployment.apiConsumerScope.length,
      licensingDomainPresent: bundle.deployment.licensingDomain.trim().length > 0,
      operatorIdPresent: bundle.deployment.operatorId.trim().length > 0,
    },
    usage: {
      triadCallPatternCount: bundle.usage.triadCallPattern.length,
      queryStructureHashPresent: bundle.usage.queryStructureHash.trim().length > 0,
      outputRoutingTargetsCount: bundle.usage.outputRoutingTargets.length,
    },
    external: {
      licensingScopeAssertionsCount: bundle.external.licensingScopeAssertions.length,
      domainCategoryFlagsCount: bundle.external.domainCategoryFlags.length,
    },
    capturedAtUtc: bundle.capturedAtUtc,
  };
}
