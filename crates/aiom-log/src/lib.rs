use serde::{Deserialize, Serialize};
use aiom_artifact::SignedArtifact;
use aiom_verify::{AiomIndependentVerifier, VerificationFailure};
use sha2::{Digest, Sha256};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum LogError {
    #[error("Verification failed: {0}")]
    VerificationFailed(VerificationFailure),
    #[error("Append-only error: {0}")]
    AppendError(String),
    #[error("Serialization error: {0}")]
    SerializationError(String),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LogEntry {
    pub sequence: u64,
    pub artifact_hash: String,
    pub merkle_root: String,
    pub roughtime_ms: i64,
    pub signature: String,
    pub prev_entry_hash: String,
}

pub struct TransparencyLog {
    entries: Vec<LogEntry>,
    current_tip_hash: String,
}

impl TransparencyLog {
    pub fn new() -> Self {
        Self {
            entries: vec![],
            current_tip_hash: "0000000000000000000000000000000000000000000000000000000000000000".to_string(), // Genesis
        }
    }

    /// AIOM v2 Requirement: C.3 Append-only log logic
    pub fn append(&mut self, artifact: &SignedArtifact) -> Result<(), LogError> {
        // 1. Verify the artifact before logging
        AiomIndependentVerifier::verify_artifact(artifact).map_err(LogError::VerificationFailed)?;

        // 2. Compute artifact hash
        let artifact_json = serde_json::to_vec(artifact).map_err(|e| LogError::SerializationError(e.to_string()))?;
        let mut hasher = Sha256::new();
        hasher.update(&artifact_json);
        let artifact_hash = hex::encode(hasher.finalize());

        // 3. Check sequence and linkage
        let sequence = self.entries.len() as u64;
        let entry = LogEntry {
            sequence,
            artifact_hash,
            merkle_root: artifact.merkle_root.clone(),
            roughtime_ms: artifact.timestamp.unix_ms,
            signature: artifact.signature.clone(),
            prev_entry_hash: self.current_tip_hash.clone(),
        };

        // 4. Update tip
        let entry_json = serde_json::to_vec(&entry).map_err(|e| LogError::SerializationError(e.to_string()))?;
        let mut hasher = Sha256::new();
        hasher.update(&entry_json);
        self.current_tip_hash = hex::encode(hasher.finalize());
        
        self.entries.push(entry);
        Ok(())
    }

    pub fn get_chain_root(&self) -> String {
        self.current_tip_hash.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use aiom_artifact::ArtifactBuilder;

    #[test]
    fn test_append_happy_path() {
        let mut log = TransparencyLog::new();
        let secret = [1u8; 32];
        let artifact = ArtifactBuilder::generate_golden_fixture(&secret);
        
        assert!(log.append(&artifact).is_ok());
        assert_eq!(log.entries.len(), 1);
        assert_eq!(log.entries[0].sequence, 0);
        assert_ne!(log.get_chain_root(), "0000000000000000000000000000000000000000000000000000000000000000");
    }

    #[test]
    fn test_chain_linkage() {
        let mut log = TransparencyLog::new();
        let secret = [1u8; 32];
        let artifact = ArtifactBuilder::generate_golden_fixture(&secret);
        
        log.append(&artifact).unwrap();
        let tip1 = log.get_chain_root();
        
        log.append(&artifact).unwrap(); // In real cases, different artifacts
        assert_eq!(log.entries[1].prev_entry_hash, tip1);
    }
}
