"""
Alchemist Strategic Fusion — chess/go ↔ music cross-attention (research).

Public API: StrategicEncoder, AlchemistFusionLayer, StrategicAttention,
StrategicDataset, strategic_coherence_loss, AlchemistStrategicModel.
"""

from alchemist_strategic_fusion.dataset import StrategicDataset, strategic_collate_fn
from alchemist_strategic_fusion.losses import next_token_ce, strategic_coherence_loss
from alchemist_strategic_fusion.pipeline import AlchemistStrategicModel
from alchemist_strategic_fusion.strategic_attention import (
    AlchemistFusionLayer,
    AlchemistFusionStack,
    StrategicAttention,
)
from alchemist_strategic_fusion.strategic_encoder import StrategicEncoder

__all__ = [
    "StrategicEncoder",
    "AlchemistFusionLayer",
    "AlchemistFusionStack",
    "StrategicAttention",
    "StrategicDataset",
    "strategic_collate_fn",
    "strategic_coherence_loss",
    "next_token_ce",
    "AlchemistStrategicModel",
]
