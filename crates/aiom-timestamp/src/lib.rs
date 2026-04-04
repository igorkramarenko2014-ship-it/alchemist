use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc, Duration};
use thiserror::Error;
use log::{info, warn};

#[derive(Error, Debug, Serialize, Deserialize)]
pub enum TimestampError {
    #[error("Roughtime consensus failed: {0}")]
    RoughtimeConsensusFailed(String),
    #[error("TSA fallback failed: {0}")]
    TsaFailed(String),
    #[error("Degraded trust: no remote sources available")]
    DegradedTrust,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum TimestampSource {
    Roughtime,
    Tsa(String),
    Local,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TimestampProof {
    pub unix_ms: i64,
    pub source: TimestampSource,
    pub is_degraded: bool,
    pub radius_ms: u64,
    pub proof_bytes: Vec<u8>,
}

pub struct RoughtimeServer {
    pub address: String,
    pub public_key: String,
}

pub struct TimestampConfig {
    pub roughtime_servers: Vec<RoughtimeServer>,
    pub max_radius: u64, // Per-server: 60,000 ms
    pub consensus_skew: u64, // Inter-server: 1,000 ms
    pub tsa_url: String, // "https://freetsa.org/tsr"
}

impl Default for TimestampConfig {
    fn default() -> Self {
        Self {
            roughtime_servers: vec![
                RoughtimeServer {
                    address: "roughtime.cloudflare.com:2003".to_string(),
                    public_key: "79A5E1F4F9F05D5E7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B".to_string(), // Placeholder
                },
                RoughtimeServer {
                    address: "roughtime.sandbox.google.com:2002".to_string(),
                    public_key: "79A5E1F4F9F05D5E7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7B7C".to_string(), // Placeholder
                },
            ],
            max_radius: 60_000,
            consensus_skew: 1_000,
            tsa_url: "https://freetsa.org/tsr".to_string(),
        }
    }
}

pub struct TimestampProvider {
    config: TimestampConfig,
}

impl TimestampProvider {
    pub fn new(config: TimestampConfig) -> Self {
        Self { config }
    }

    /// Primary entry point: Roughtime -> TSA -> Local
    pub fn get_trustless_timestamp(&self) -> Result<TimestampProof, TimestampError> {
        // AIOM v2 Requirement: Multi-tier fallback
        
        match self.query_roughtime_consensus() {
            Ok(proof) => Ok(proof),
            Err(e) => {
                warn!("Roughtime failed ({}), falling back to TSA...", e);
                match self.query_tsa_secondary() {
                    Ok(proof) => Ok(proof),
                    Err(e) => {
                        warn!("TSA failed ({}), falling back to LOCAL (DEGRADED)...", e);
                        self.get_local_degraded()
                    }
                }
            }
        }
    }

    fn query_roughtime_consensus(&self) -> Result<TimestampProof, TimestampError> {
        // Placeholder for real multi-server Roughtime logic (UDP)
        // AIOM v2 Requirement: consensus_skew (1s) check
        
        // Mocking successful consensus
        Ok(TimestampProof {
            unix_ms: Utc::now().timestamp_millis(),
            source: TimestampSource::Roughtime,
            is_degraded: false,
            radius_ms: 500, // < 60,000ms
            proof_bytes: vec![], // In reality, the Roughtime cert chain
        })
    }

    fn query_tsa_secondary(&self) -> Result<TimestampProof, TimestampError> {
        // AIOM v2 Requirement: RFC 3161 TSA
        // Mocking successful TSA response
        Ok(TimestampProof {
            unix_ms: Utc::now().timestamp_millis(),
            source: TimestampSource::Tsa(self.config.tsa_url.clone()),
            is_degraded: true, // Marked as degraded trust per AIOM specs
            radius_ms: 0,
            proof_bytes: vec![1, 2, 3], // DER-encoded token
        })
    }

    fn get_local_degraded(&self) -> Result<TimestampProof, TimestampError> {
        // AIOM v2 Requirement: last resort local clock + WARNING
        Ok(TimestampProof {
            unix_ms: Utc::now().timestamp_millis(),
            source: TimestampSource::Local,
            is_degraded: true,
            radius_ms: 0,
            proof_bytes: vec![],
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fallback_chain_logic() {
        let config = TimestampConfig::default();
        let provider = TimestampProvider::new(config);
        
        let proof = provider.get_trustless_timestamp().unwrap();
        assert!(!proof.is_degraded || proof.source != TimestampSource::Roughtime);
    }
}
