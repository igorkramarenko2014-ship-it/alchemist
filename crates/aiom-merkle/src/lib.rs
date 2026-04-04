use rs_merkle::{MerkleTree, MerkleProof, algorithms::Sha256};
use sha2::{Digest, Sha256 as Sha2};
use hex;

/**
 * AIOM v2: Merkle Proof Wrapper
 * 
 * Provides proof of inclusion for individual trace steps 
 * within the overall execution commitment.
 */

pub struct AiomMerkleWrapper {
    pub tree: MerkleTree<Sha256>,
}

impl AiomMerkleWrapper {
    pub fn build_from_hashes(hashes: &[String]) -> Self {
        let leaf_hashes: Vec<[u8; 32]> = hashes
            .iter()
            .map(|h| {
                let mut hasher = Sha2::new();
                hasher.update(h.as_bytes());
                hasher.finalize().into()
            })
            .collect();

        Self {
            tree: MerkleTree::<Sha256>::from_leaves(&leaf_hashes),
        }
    }

    pub fn get_root_hex(&self) -> Option<String> {
        self.tree.root().map(hex::encode)
    }

    pub fn verify_proof(
        proof: &MerkleProof<Sha256>,
        root: [u8; 32],
        indices: &[usize],
        leaf_hashes: &[[u8; 32]],
        total_leaves_count: usize,
    ) -> bool {
        proof.verify(root, indices, leaf_hashes, total_leaves_count)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merkle_root_stability() {
        let h1 = "step1_hash".to_string();
        let h2 = "step2_hash".to_string();
        let hashes = vec![h1, h2];

        let tree1 = AiomMerkleWrapper::build_from_hashes(&hashes);
        let tree2 = AiomMerkleWrapper::build_from_hashes(&hashes);

        assert_eq!(tree1.get_root_hex(), tree2.get_root_hex());
    }

    #[test]
    fn test_merkle_consistency() {
        let hashes = vec!["a".to_string(), "b".to_string(), "c".to_string()];
        let wrapper = AiomMerkleWrapper::build_from_hashes(&hashes);
        let root = wrapper.get_root_hex().unwrap();
        
        // Changing a leaf changes the root
        let hashes_corrupt = vec!["a".to_string(), "X".to_string(), "c".to_string()];
        let wrapper_corrupt = AiomMerkleWrapper::build_from_hashes(&hashes_corrupt);
        
        assert_ne!(root, wrapper_corrupt.get_root_hex().unwrap());
    }
}
