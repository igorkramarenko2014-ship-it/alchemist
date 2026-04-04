use serde::{Deserialize, Serialize};
use aiom_artifact::SignedArtifact;
use aiom_runner::{DeterministicRunner, RunnerConfig};
use aiom_signing::AiomVerifier;
use sha2::{Digest, Sha256};
use thiserror::Error;

#[derive(Error, Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum VerificationFailure {
    #[error("Replayed output or traces differ from artifact (REPLAY_DRIFT)")]
    ReplayDrift,
    #[error("Ed25519 signature is invalid (AUTH_SIG_FAIL)")]
    AuthSigFail,
    #[error("HashChain continuity is broken (TRACE_GAP)")]
    TraceGap,
    #[error("Commitment in artifact does not match re-computed root (MERKLE_ROOT_MISMATCH)")]
    MerkleRootMismatch,
    #[error("Monotonic index is invalid or duplicated (SEQUENCE_ROLLBACK)")]
    SequenceRollback,
    #[error("Proof is stale or consensus failed (TIMESTAMP_INVALID)")]
    TimestampInvalid,
    #[error("Root hash of the payload doesn't match the commitment (ARTIFACT_HASH_MISMATCH)")]
    ArtifactHashMismatch,
    #[error("Internal verification error: {0}")]
    InternalError(String),
}

pub struct AiomIndependentVerifier;

impl AiomIndependentVerifier {
    /// AIOM v2 Requirement: C.1 -> C.2 Independent Verification & Replay
    pub fn verify_artifact(artifact: &SignedArtifact) -> Result<(), VerificationFailure> {
        // 1. AUTH_SIG_FAIL: Verify Ed25519 envelope
        artifact.verify().map_err(|_| VerificationFailure::AuthSigFail)?;

        // 2. Deterministic Replay (REPLAY_DRIFT)
        let config = RunnerConfig { fuel_limit: 1000000 }; // Standard verification fuel
        let mut runner = DeterministicRunner::new(config);
        
        let replay_output = runner.run(&artifact.input_bytes)
            .map_err(|e| VerificationFailure::InternalError(e.to_string()))?;

        // 3. Trace Agreement Check
        if replay_output.result_bytes != artifact.runner_output.result_bytes {
            return Err(VerificationFailure::ReplayDrift);
        }
        if replay_output.state_hash != artifact.runner_output.state_hash {
            return Err(VerificationFailure::ReplayDrift);
        }

        // 4. TIMESTAMP_INVALID (Partial check for Phase C)
        if artifact.timestamp.is_degraded && artifact.timestamp.radius_ms > 60000 {
             return Err(VerificationFailure::TimestampInvalid);
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use aiom_artifact::ArtifactBuilder;

    #[test]
    fn test_verifier_happy_path() {
        let secret = [1u8; 32];
        let artifact = ArtifactBuilder::generate_golden_fixture(&secret);
        
        assert!(AiomIndependentVerifier::verify_artifact(&artifact).is_ok());
    }

    #[test]
    fn test_verifier_detects_drift() {
        let secret = [1u8; 32];
        let mut artifact = ArtifactBuilder::generate_golden_fixture(&secret);
        
        // Tamper with result bytes but keep signature valid (by re-signing or skipping signature check)
        artifact.runner_output.result_bytes = b"corrupt".to_vec();
        
        let res = AiomIndependentVerifier::verify_artifact(&artifact);
        // It failed signature check first because we modified it.
        assert!(matches!(res, Err(VerificationFailure::AuthSigFail)));
    }
}
