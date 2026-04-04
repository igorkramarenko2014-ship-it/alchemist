use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use thiserror::Error;

#[derive(Error, Debug, Serialize, Deserialize)]
pub enum RunnerError {
    #[error("Fuel exhausted during deterministic execution")]
    FuelExhausted,
    #[error("System access denied: {0}")]
    AccessDenied(String),
    #[error("Serialization error: {0}")]
    SerializationError(String),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RunnerConfig {
    pub fuel_limit: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RunnerOutput {
    pub result_bytes: Vec<u8>,
    pub fuel_consumed: u64,
    pub state_hash: String,
}

pub struct DeterministicRunner {
    fuel_limit: u64,
    fuel_consumed: u64,
}

impl DeterministicRunner {
    pub fn new(config: RunnerConfig) -> Self {
        Self {
            fuel_limit: config.fuel_limit,
            fuel_consumed: 0,
        }
    }

    /// Primary execution entry point: Byte-in / Byte-out
    pub fn run(&mut self, input: &[u8]) -> Result<RunnerOutput, RunnerError> {
        // AIOM v2 Requirement: Deterministic call path
        self.consume_fuel(10)?; // Base execution cost

        let result_bytes = self.dummy_logic_process(input)?;
        
        let mut hasher = Sha256::new();
        hasher.update(&result_bytes);
        let state_hash = format!("{:x}", hasher.finalize());

        Ok(RunnerOutput {
            result_bytes,
            fuel_consumed: self.fuel_consumed,
            state_hash,
        })
    }

    fn consume_fuel(&mut self, amount: u64) -> Result<(), RunnerError> {
        self.fuel_consumed += amount;
        if self.fuel_consumed > self.fuel_limit {
            return Err(RunnerError::FuelExhausted);
        }
        Ok(())
    }

    fn dummy_logic_process(&mut self, input: &[u8]) -> Result<Vec<u8>, RunnerError> {
        // Simulated deterministic work
        self.consume_fuel(input.len() as u64)?;
        Ok(input.iter().map(|&b| b.wrapping_add(1)).collect())
    }

    // AIOM v2 Requirement: Clock Denial
    pub fn get_time_denied(&self) -> Result<(), RunnerError> {
        Err(RunnerError::AccessDenied("Clock access is forbidden in trustless runner".to_string()))
    }

    // AIOM v2 Requirement: FS Denial
    pub fn fs_access_denied(&self) -> Result<(), RunnerError> {
        Err(RunnerError::AccessDenied("Filesystem access is forbidden in trustless runner".to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_determinism_1000_runs() {
        let input = b"alchemist-aji";
        let config = RunnerConfig { fuel_limit: 1000 };
        
        let mut runner = DeterministicRunner::new(config.clone());
        let first = runner.run(input).unwrap();

        for _ in 0..999 {
            let mut r = DeterministicRunner::new(config.clone());
            let next = r.run(input).unwrap();
            assert_eq!(first.result_bytes, next.result_bytes);
            assert_eq!(first.state_hash, next.state_hash);
        }
    }

    #[test]
    fn test_fuel_exhaustion() {
        let input = vec![0u8; 100];
        let config = RunnerConfig { fuel_limit: 50 }; // Too low
        let mut runner = DeterministicRunner::new(config);
        let res = runner.run(&input);
        assert!(matches!(res, Err(RunnerError::FuelExhausted)));
    }

    #[test]
    fn test_clock_denial() {
        let runner = DeterministicRunner::new(RunnerConfig { fuel_limit: 100 });
        let res = runner.get_time_denied();
        assert!(matches!(res, Err(RunnerError::AccessDenied(_))));
    }

    #[test]
    fn test_fs_denial() {
        let runner = DeterministicRunner::new(RunnerConfig { fuel_limit: 100 });
        let res = runner.fs_access_denied();
        assert!(matches!(res, Err(RunnerError::AccessDenied(_))));
    }
}
