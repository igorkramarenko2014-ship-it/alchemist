# What Models? — vendored data (local GPU / LLM fit)

**Not** Alchemist product law. **Reference** for “what fits on a GPU” style planning (e.g. future local inference, docs, talent notes). Hosted triad APIs (DeepSeek / Groq / OpenRouter) do **not** use your VRAM the same way.

## Source

| | |
|--|--|
| **Project** | [What Models?](https://whatmodelscanirun.com/) |
| **Repository** | [github.com/BenD10/whatmodels](https://github.com/BenD10/whatmodels) |
| **License** | [MIT](https://raw.githubusercontent.com/BenD10/whatmodels/main/LICENSE.md) |
| **Files** | `models.json`, `gpus.json` — copied from `src/lib/data/` on `main` |

## Refresh

From monorepo root:

```bash
pnpm talent:sync-whatmodels
```

Then commit if diffs look sane. See `manifest.json` for `fetchedAt` and counts.

## Fields (models)

Typical entries include: `id`, `name`, `params_b`, `quantization`, `weight_gb`, `kv_per_1k_gb`, `max_context_k`, `layers`, `mmlu_score`, `swe_bench_score`, `features`, `notes`. VRAM heuristic upstream: `weight_gb + kv_per_1k_gb × context_k`.
