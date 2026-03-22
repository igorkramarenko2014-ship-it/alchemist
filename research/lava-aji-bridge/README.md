# Lava–Aji OSC bridge (optional)

**What:** Webcam or video file → OpenCV blob/contour features → smoothed **OSC** (e.g. `/alchemist/subtle/...`) for a DAW, Reaper, Max, Bitwig, etc.

**What not:** Not part of the browser Serum preset pipeline (`apps/web-app`, `shared-engine`). No `.fxp` or offset-map claims here.

## Setup

```bash
cd research/lava-aji-bridge
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
# Webcam 0, OSC to localhost:8000
python lava_aji_osc.py

# Video file, custom OSC port
python lava_aji_osc.py --source ./lava.mp4 --osc-port 9000

# Gooier regions: Otsu + contours (often better on real lava lamps)
python lava_aji_osc.py --mode contour --source ./lava.mp4

# Cap CPU / OSC rate (e.g. 30 Hz)
python lava_aji_osc.py --max-fps 30

# Headless machine: use a file source; GUI preview off
python lava_aji_osc.py --source clip.mp4 --no-preview
```

Map `/alchemist/subtle/cutoff`, `/alchemist/subtle/resonance`, `/alchemist/subtle/lfo_rate`, `/alchemist/subtle/scatter` in your receiver.

## Aji heuristic (sugarcoat)

CLI flags `--vibe precise|chaotic` adjust smoothing and bias curves (see `--help`). This is **control UX**, not Go AI (KataGo, etc.); wiring a board evaluator would be a separate optional module.
