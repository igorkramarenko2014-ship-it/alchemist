use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use hex;

/**
 * AIOM v2: Hash-Chain Trace
 * 
 * Each execution step is linked to the previous step's hash.
 * This creates an immutable, verifiable audit trail of the runner's lifecycle.
 */

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TraceStep {
    pub sequence: u64,
    pub prev_hash: String,
    pub data_hash: String,
    pub timestamp: String, // Canonical UTC string (provided by host)
}

impl TraceStep {
    pub fn compute_hash(&self) -> String {
        let mut hasher = Sha256::new();
        hasher.update(self.sequence.to_be_bytes());
        hasher.update(self.prev_hash.as_bytes());
        hasher.update(self.data_hash.as_bytes());
        hasher.update(self.timestamp.as_bytes());
        hex::encode(hasher.finalize())
    }
}

pub struct HashChain {
    pub steps: Vec<TraceStep>,
    pub current_root: String,
}

impl HashChain {
    pub fn new() -> Self {
        Self {
            steps: Vec::new(),
            current_root: "0".repeat(64), // Genesis
        }
    }

    pub fn append_step(&mut self, data_hash: String, timestamp: String) -> String {
        let sequence = self.steps.len() as u64;
        let step = TraceStep {
            sequence,
            prev_hash: self.current_root.clone(),
            data_hash,
            timestamp,
        };

        let step_hash = step.compute_hash();
        self.steps.push(step);
        self.current_root = step_hash.clone();
        step_hash
    }

    pub fn verify_chain(&self) -> bool {
        let mut expected_prev = "0".repeat(64);
        for step in &self.steps {
            if step.prev_hash != expected_prev {
                return false;
            }
            expected_prev = step.compute_hash();
        }
        expected_prev == self.current_root
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_trace_linkage() {
        let mut chain = HashChain::new();
        let h1 = chain.append_step("data1".to_string(), "2026-04-03T18:00:00Z".to_string());
        let h2 = chain.append_step("data2".to_string(), "2026-04-03T18:00:01Z".to_string());

        assert_eq!(chain.steps.len(), 2);
        assert_eq!(chain.steps[1].prev_hash, h1);
        assert_eq!(chain.current_root, h2);
        assert!(chain.verify_chain());
    }

    #[test]
    fn test_trace_corruption() {
        let mut chain = HashChain::new();
        chain.append_step("data1".to_string(), "2026-04-03T18:00:00Z".to_string());
        chain.append_step("data2".to_string(), "2026-04-03T18:00:01Z".to_string());

        // Corrupt an early step
        chain.steps[0].data_hash = "CORRUPT".to_string();
        assert!(!chain.verify_chain());
    }
}
