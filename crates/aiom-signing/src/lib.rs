use ed25519_dalek::{SigningKey, Signer, VerifyingKey, Signature, Verifier};
use sha2::{Digest, Sha256};
use thiserror::Error;
use hex;

#[derive(Error, Debug)]
pub enum SigningError {
    #[error("Invalid secret key length (expected 32 bytes)")]
    InvalidKeyLength,
    #[error("Signature verification failed")]
    VerificationFailed,
    #[error("Serialization error: {0}")]
    SerializationError(String),
}

pub struct AiomSigner {
    signing_key: SigningKey,
}

impl AiomSigner {
    /// AIOM v2 Requirement: In-memory secret injection (no .key files)
    pub fn from_bytes(secret: &[u8; 32]) -> Self {
        let signing_key = SigningKey::from_bytes(secret);
        Self { signing_key }
    }

    pub fn sign(&self, payload: &[u8]) -> String {
        let signature = self.signing_key.sign(payload);
        hex::encode(signature.to_bytes())
    }

    pub fn verifying_key_hex(&self) -> String {
        hex::encode(self.signing_key.verifying_key().to_bytes())
    }
}

pub struct AiomVerifier;

impl AiomVerifier {
    pub fn verify(public_key_hex: &str, payload: &[u8], signature_hex: &str) -> Result<(), SigningError> {
        let pub_bytes = hex::decode(public_key_hex).map_err(|_| SigningError::SerializationError("Invalid hex key".to_string()))?;
        let sig_bytes = hex::decode(signature_hex).map_err(|_| SigningError::SerializationError("Invalid hex signature".to_string()))?;
        
        let verifying_key = VerifyingKey::try_from(&pub_bytes[..]).map_err(|_| SigningError::VerificationFailed)?;
        let signature = Signature::from_slice(&sig_bytes).map_err(|_| SigningError::VerificationFailed)?;
        
        verifying_key.verify(payload, &signature).map_err(|_| SigningError::VerificationFailed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sign_verify_happy_path() {
        let secret = [0u8; 32]; // Fixed deterministic key for tests
        let signer = AiomSigner::from_bytes(&secret);
        let payload = b"aiom-v2-test-payload";
        
        let signature = signer.sign(payload);
        let pub_key = signer.verifying_key_hex();
        
        assert!(AiomVerifier::verify(&pub_key, payload, &signature).is_ok());
    }

    #[test]
    fn test_tamper_detection() {
        let secret = [0u8; 32];
        let signer = AiomSigner::from_bytes(&secret);
        let payload = b"valid-payload";
        
        let signature = signer.sign(payload);
        let pub_key = signer.verifying_key_hex();
        
        // Change 1 byte in payload
        let tampered_payload = b"valid-payloae";
        assert!(AiomVerifier::verify(&pub_key, tampered_payload, &signature).is_err());
        
        // Change 1 character in signature string to ensure it's different
        let mut tampered_sig = signature.clone();
        let first_char = tampered_sig.chars().next().unwrap();
        let new_char = if first_char == '0' { '1' } else { '0' };
        tampered_sig.replace_range(0..1, &new_char.to_string()); 
        assert!(AiomVerifier::verify(&pub_key, payload, &tampered_sig).is_err());
    }
}
