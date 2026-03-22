"""Shape contracts for StrategicEncoder + AlchemistFusionLayer."""

import torch

from alchemist_strategic_fusion.losses import strategic_coherence_loss
from alchemist_strategic_fusion.pipeline import AlchemistStrategicModel
from alchemist_strategic_fusion.strategic_attention import AlchemistFusionLayer
from alchemist_strategic_fusion.strategic_encoder import StrategicEncoder


def test_encoder_and_fusion_shapes():
    b, tg, tm, f, d, heads = 2, 24, 48, 960, 256, 8
    enc = StrategicEncoder(f, d, heads, n_layers=2)
    fusion = AlchemistFusionLayer(d, heads)
    g = torch.randn(b, tg, f)
    mem = enc(g)
    assert mem.shape == (b, tg, d)
    mt = torch.randint(0, 512, (b, tm))
    emb = torch.randn(b, tm, d)  # pretend embedded
    fused = fusion(emb, mem)
    assert fused.shape == (b, tm, d)


def test_coherence_loss_scalar():
    b, tg, tm, d = 2, 16, 32, 64
    gm = torch.randn(b, tg, d, requires_grad=True)
    fm = torch.randn(b, tm, d, requires_grad=True)
    loss = strategic_coherence_loss(gm, fm)
    assert loss.ndim == 0
    loss.backward()


def test_full_pipeline():
    m = AlchemistStrategicModel(
        game_feature_dim=960,
        vocab_size=512,
        d_model=256,
        n_heads=8,
        encoder_layers=2,
        fusion_layers=2,
    )
    g = torch.randn(2, 20, 960)
    tok = torch.randint(0, 512, (2, 40))
    out = m(g, tok)
    assert out["fused_music"].shape == (2, 40, 256)
    assert out["logits"].shape == (2, 40, 512)
