# MercuryBall (technical notes)

**Shipped look (current):** **Master GLSL injection** — six **non-axis** impact centers (`±(1,1,1)` family + two skew), `sin(d*14 - uTime*2.5*uRippleTimeScale)/(1+3d)`, **`finalDisp = totalDisp * 0.08 * uVividness`**; fragment **`uTealFloor`** + **`vNormal.y`** floor mask **×0.45** + peak **`step(0.04, max(vDisplacement,0)) * 0.15`** on **`outgoingLight`** (not `gl_FragColor`). **`RoomEnvironment` PMREM**, **`ContactShadows`**, **`Float`**, key **`directionalLight [5,5,5] intensity 2`**. Sphere **`[1,256,256]`**. **Cache:** `alchemist-mercury-master-glsl-v3`.

**Honesty:** There is no “copy-paste” from a PNG into WebGL — the ref is an offline render. This pass **removes invented layers** (cove, heavy vignette, loud emissive) and **retunes** toward the reference recipe.

**Reference brief:** user `image-9901…` / `image_b7c7e7` family — liquid chrome, concentric ripples, teal floor + underglow.

**FIRE:** `docs/FIRE.md` — dock/orb invariants + latest Mercury delta. **`docs/FIRESTARTER.md`** — full project orientation.

---

## Dock (prompt ↔ results)

**Branching:** `PromptAudioDock` renders **`EarModeController`** (compact) when there are no presets — that component includes **its own** `MercuryBall`. After triad, **`hasPresets`** switches the dock to a **separate** results subtree with another `MercuryBall` for preview/export. Same **`MERCURY_ORB_FRAME_CLASS`** keeps **layout** consistent; **WebGL may remount** when switching branches.

**Share preset (home `page.tsx`):** When the winning gated row meets share thresholds, **Share preset** calls **`POST /api/presets/share`** and surfaces an absolute URL to **`/presets/[slug]`**. Shared pages show metadata + param heatmap only — **no** Serum **`.fxp`** bytes on the shared record (**`docs/FIRESTARTER.md` §8**).

---

## File map

| Path | Role |
|------|------|
| `components/ui/MercuryBall.tsx` | **`LiquidChromeSphere`**: `MeshPhysicalMaterial` + **6-droplet** ripples; teal floor in fragment; **`ProceduralRoomEnvironment`** (`RoomEnvironment` PMREM); **`Float`**, **`ContactShadows`** |
| `components/ui/MercuryBallShell.tsx` | **Fixed** layout (no CSS drift); **Web MIDI** → brightness only; optional **button** for orb tap |
| `components/ui/PromptAudioDock.tsx` | **Gravity well:** `hasPresets` → results hint + orb + export row + `TriadSamplePlayer`; else **`EarModeController`** (compact). **Web MIDI** auto-connect |
| `components/ui/EarModeController.tsx` | Mic + Web Speech → append prompt; **`compact`**: tap orb to start ear mode; **Stop** while listening; non-compact: Start + Stop |
| `lib/ear-tier.ts` | `resolveMercuryTier()`, `mercuryTransmutationRate()` — **basic** vs **ultra** ripple speed |
| `hooks/useResolvedMercuryTier.ts` | Subscribes to **reduced-motion** + **viewport (768px)** + **`hasPresets`** → `earTier` |
| `hooks/useWebMidi.ts` | `requestMIDIAccess`, Note-On velocity → decaying **0–1** norm for the shell |
| `components/ui/TriadSamplePlayer.tsx` | Web Audio chimes from `lib/preset-preview-chime.ts` (param-vector previews, not Serum render) |
| `lib/mercury-orb-frame.ts` | **`MERCURY_ORB_FRAME_CLASS`** — shared orb viewport (prompt + results, no layout jump) |
| `lib/audio-prompt-module.ts` | `startAudioPrompt`, `isAudioPromptSupported` |
| `lib/preset-preview-chime.ts` | Short sine/triangle stack from `paramArray` |
| `app/globals.css` | Optional `.alchemist-mercury-drift` (off by default; orb stays fixed) |

**Post-generate:** Home `page.tsx` passes `canExportTopPreset` + `onExportTopPreset` → **Export .fxp** in the row below the orb. **Orb tap** = Web Audio preview only. **FIRE:** bridge loads **`.fxp` only** — no MIDI NoteOn through the bridge; browser may send **`sendSerumAuditionNote`** after bridge push when audition is wired.

> **Shipped in this repo:** `MercuryBall.tsx` (R3F + liquid chrome **256×256** sphere + `ContactShadows` + `Float`), `MercuryBallShell`, `PromptAudioDock`, `EarModeController`, `TriadSamplePlayer`, `TokenUsageIndicator` + `/api/usage`, hooks + `lib/*`. Home: dock-only export for #1; **WASM-gated** export (`encodeFxp` + **`GET /api/health/wasm`** — see **`docs/FIRESTARTER.md` §10**, **`docs/FIRE.md` §C**).

---

## Material (`MeshPhysicalMaterial` + droplet shader)

| Field | Typical value |
|-------|---------------|
| `color` | `#ffffff` (pure reflection base) |
| `metalness` | `1` |
| `roughness` | `0.02` |
| `ior` | `2.5` |
| `iridescence` | `0.3` |
| `clearcoat` / `clearcoatRoughness` | `1` / `0.02` |
| `envMapIntensity` | `1.5` base (animated slightly with `vividness` / Ear Mode) |

**Uniforms (shader):** `uTime`, `uVividness`, `uRippleSpeed` (from `mercuryTransmutationRate`).

**Cache key:** `alchemist-mercury-b7c7e7-liquid-chrome-v1` — bump if GLSL or scene stack changes.

---

## Reliability (blank viewport)

- **No `drei` `Environment` presets** (remote HDRI): **`RoomEnvironment`** + **`PMREMGenerator`** runs in **`useLayoutEffect`** — no `useLoader` / no network.
- **`ContactShadows`** does not suspend; keep **`Canvas`** alpha clear for page bg.

---

## Runtime props

```ts
export interface MercuryBallProps {
  vividness: number;
  isEarMode?: boolean;
  /** Fixed-height shells only: no 280–360px min-height; `overflow-hidden` on the parent recommended */
  fitParent?: boolean;
  /** `basic` = very slow liquid surface evolution; `ultra` faster — orb position/rotation stay fixed */
  earTier?: 'basic' | 'ultra';
}
```

**Layout / overlays:** Prompt + results dock share **`MERCURY_ORB_FRAME_CLASS`** (**220 / 280px**, `p-3 md:p-4`). Non-compact Ear UI may use taller shells. Use **`fitParent`** inside **`relative isolate … overflow-hidden`**; canvas uses **`pointer-events-none`** so stray hits still reach HTML controls.

---

## Quality tiers

| Condition | Effect |
|-----------|--------|
| Sphere segments | Fixed **256 × 256** (ref image — do not lower without retuning ripples) |
| Reduced motion | Ripple **time** scaled down (`uTime * 0.35`); vividness unchanged |
| `earTier: ultra` | Faster ripple phase via `mercuryTransmutationRate` → `uRippleSpeed` |

---

## Maintainer checklist

1. Changing orb **box size** → update **`MERCURY_ORB_FRAME_CLASS`** once; grep consumers.  
2. Adding a **second** `MercuryBall` on the home flow → update **FIRE.md** §A and justify (or reject).  
3. Encoder / Serum bytes → **HARD GATE** `serum-offset-map.ts` + `validate-offsets.py` (see repo rules).
