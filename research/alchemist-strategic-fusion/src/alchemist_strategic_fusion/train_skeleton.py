"""
Minimal training loop: CE (next-token) + strategic_coherence_loss.

Run on CUDA when available; uses autocast for consumer GPUs.
Flash / mem-efficient SDPA is selected inside PyTorch attention on supported hardware.
"""

from __future__ import annotations

import torch
from torch import amp

from alchemist_strategic_fusion.losses import next_token_ce, strategic_coherence_loss
from alchemist_strategic_fusion.pipeline import AlchemistStrategicModel


def training_step(
    model: AlchemistStrategicModel,
    batch: dict[str, torch.Tensor],
    optimizer: torch.optim.Optimizer,
    scaler: amp.GradScaler | None,
    w_coherence: float = 0.35,
    pad_token_id: int = 0,
) -> dict[str, float]:
    """
    batch: `game_features`, `music_tokens`, `key_padding_mask_game`, `key_padding_mask_music`
    Targets: shift music_tokens[:, 1:] vs logits[:, :-1]
    """
    device = next(model.parameters()).device
    g = batch["game_features"].to(device)
    m = batch["music_tokens"].to(device)
    kg = batch.get("key_padding_mask_game")
    if kg is not None:
        kg = kg.to(device)
    km = batch.get("key_padding_mask_music")
    if km is not None:
        km = km.to(device)

    optimizer.zero_grad(set_to_none=True)
    use_amp = scaler is not None and device.type == "cuda"
    autocast_device = "cuda" if device.type == "cuda" else "cpu"

    with amp.autocast(device_type=autocast_device, enabled=use_amp):
        out = model(g, m, key_padding_mask_game=kg, key_padding_mask_music=km)
        logits = out["logits"]
        fused = out["fused_music"]
        gm = out["game_memory"]
        # Causal LM: predict token t from position t-1
        logits_pred = logits[:, :-1, :].contiguous()
        targets = m[:, 1:].contiguous()
        if km is not None:
            targets = targets.masked_fill(km[:, 1:], -100)
        ce = next_token_ce(logits_pred, targets, ignore_index=-100)
        coh = strategic_coherence_loss(gm, fused)
        loss = ce + w_coherence * coh

    if use_amp:
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
    else:
        loss.backward()
        optimizer.step()

    return {"loss": float(loss.detach()), "ce": float(ce.detach()), "coherence": float(coh.detach())}
