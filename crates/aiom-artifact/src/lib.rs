use serde::{Deserialize, Serialize};
use serde_json;
use sha2::Sha256;
use aiom_runner::{RunnerOutput, RunnerConfig, DeterministicRunner};
use aiom_timestamp::TimestampProof;
use aiom_signing::{AiomSigner, AiomVerifier};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ArtifactError {
    #[error("Signature mismatch")]
    InvalidSignature,
    #[error("Trace mismatch")]
    InvalidTrace,
    #[error("Serialization error: {0}")]
    SerializationError(String),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SignedArtifact {
    pub runner_output: RunnerOutput,
    pub input_bytes: Vec<u8>, // Canonical replay input
    pub trace_root: String,
    pub merkle_root: String,
    pub timestamp: TimestampProof,
    pub signature: String,
    pub public_key: String,
}

impl SignedArtifact {
    pub fn new(
        runner_output: RunnerOutput,
        trace_root: String,
        merkle_root: String,
        timestamp: TimestampProof,
        signer: &AiomSigner,
    ) -> Result<Self, ArtifactError> {
        let mut artifact = Self {
            runner_output,
            input_bytes: vec![], // Placeholder, should be passed in real cases
            trace_root,
            merkle_root,
            timestamp,
            signature: String::new(),
            public_key: signer.verifying_key_hex(),
        };

        // Sign the hash of the whole artifact (excluding signature itself)
        let payload = artifact.compute_signing_payload()?;
        artifact.signature = signer.sign(&payload);
        
        Ok(artifact)
    }

    fn compute_signing_payload(&self) -> Result<Vec<u8>, ArtifactError> {
        // AIOM v2 Requirement: Deterministic canonical serialization
        // For Phase B, we use deterministic JSON as the byte payload.
        let mut temp = self.clone();
        temp.signature = String::new(); // Clear before hashing
        serde_json::to_vec(&temp).map_err(|e| ArtifactError::SerializationError(e.to_string()))
    }

    pub fn verify(&self) -> Result<(), ArtifactError> {
        let payload = self.compute_signing_payload()?;
        AiomVerifier::verify(&self.public_key, &payload, &self.signature)
            .map_err(|_| ArtifactError::InvalidSignature)
    }
}

pub struct ArtifactBuilder;

impl ArtifactBuilder {
    pub fn generate_golden_fixture(secret: &[u8; 32]) -> SignedArtifact {
        let signer = AiomSigner::from_bytes(secret);
        
        let input_bytes = b"golden-input".to_vec();
        let config = RunnerConfig { fuel_limit: 1000 };
        let mut runner = DeterministicRunner::new(config);
        let output = runner.run(&input_bytes).unwrap();

        let timestamp = TimestampProof {
            unix_ms: 1712160000000,
            source: aiom_timestamp::TimestampSource::Roughtime,
            is_degraded: false,
            radius_ms: 500,
            proof_bytes: vec![],
        };

        let mut artifact = SignedArtifact::new(
            output,
            "trace_root_123".to_string(),
            "merkle_root_456".to_string(),
            timestamp,
            &signer,
        ).unwrap();

        artifact.input_bytes = input_bytes;
        
        // Re-sign because input changed
        let payload = artifact.compute_signing_payload().unwrap();
        artifact.signature = signer.sign(&payload);
        artifact
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_signed_artifact_integrity() {
        let secret = [1u8; 32];
        let artifact = ArtifactBuilder::generate_golden_fixture(&secret);
        
        assert!(artifact.verify().is_ok());

        // Modify 1 byte in trace_root
        let mut tampered = artifact.clone();
        tampered.trace_root = "corrupt".to_string();
        assert!(tampered.verify().is_err());
    }
}
