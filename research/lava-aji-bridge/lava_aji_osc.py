#!/usr/bin/env python3
"""
Lava lamp / fluid video → blob features → OSC "sugarcoat" layer (/alchemist/subtle/*).

Velocity is **inter-frame centroid displacement** (greedy match), not random.
"""

from __future__ import annotations

import argparse
import math
import time
from dataclasses import dataclass, field
from typing import Dict, List, Tuple

import cv2
import numpy as np
from pythonosc import udp_client


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Alchemist Lava–Aji → OSC bridge")
    p.add_argument("--source", default="0", help="Webcam index or path to video file")
    p.add_argument("--osc-host", default="127.0.0.1")
    p.add_argument("--osc-port", type=int, default=8000)
    p.add_argument("--vibe", choices=("precise", "chaotic", "neutral"), default="neutral")
    p.add_argument("--no-preview", action="store_true", help="Do not open cv2.imshow (servers)")
    p.add_argument("--min-area", type=float, default=100.0)
    p.add_argument("--max-area", type=float, default=50_000.0)
    p.add_argument(
        "--mode",
        choices=("blob", "contour"),
        default="blob",
        help="blob=SimpleBlobDetector; contour=gooey regions via threshold+findContours",
    )
    p.add_argument("--max-fps", type=float, default=0.0, help="Cap processing rate (0 = unlimited)")
    p.add_argument("--contour-max", type=int, default=12, help="Max regions to track in contour mode")
    return p.parse_args()


def open_capture(source: str) -> cv2.VideoCapture:
    if source.isdigit():
        cap = cv2.VideoCapture(int(source))
    else:
        cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        raise SystemExit(f"Could not open source: {source}")
    return cap


def make_blob_detector(min_area: float, max_area: float) -> cv2.SimpleBlobDetector:
    params = cv2.SimpleBlobDetector_Params()
    params.filterByColor = False
    params.filterByArea = True
    params.minArea = min_area
    params.maxArea = max_area
    params.filterByCircularity = False
    params.filterByConvexity = False
    params.filterByInertia = False
    return cv2.SimpleBlobDetector_create(params)


def extract_contour_features(
    gray_blur: np.ndarray,
    min_area: float,
    max_area: float,
    contour_max: int,
) -> Tuple[List[Tuple[float, float]], List[float], list]:
    """
    Lava-friendly regions: Otsu threshold → external contours → centroids + areas.
    Returns centroids, areas, synthetic KeyPoints for drawKeypoints preview.
    """
    _, th = cv2.threshold(gray_blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    if float(np.mean(th)) > 127:
        th = cv2.bitwise_not(th)
    th = cv2.morphologyEx(th, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    contours, _ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    scored: List[Tuple[float, Tuple[float, float]]] = []
    for c in contours:
        a = float(cv2.contourArea(c))
        if a < min_area or a > max_area:
            continue
        m = cv2.moments(c)
        if m["m00"] <= 1e-6:
            continue
        cx = float(m["m10"] / m["m00"])
        cy = float(m["m01"] / m["m00"])
        scored.append((a, (cx, cy)))
    scored.sort(key=lambda x: -x[0])
    scored = scored[:contour_max]
    pts = [s[1] for s in scored]
    areas = [s[0] for s in scored]
    kps: List[cv2.KeyPoint] = []
    for (cx, cy), a in zip(pts, areas):
        d = max(6.0, min(80.0, math.sqrt(a / math.pi) * 2.0))
        kps.append(cv2.KeyPoint(cx, cy, d))
    return pts, areas, kps


def match_keypoints_greedy(
    prev: List[Tuple[float, float]],
    curr: List[Tuple[float, float]],
) -> Dict[int, int]:
    """Map curr index -> prev index by greedy nearest-neighbor (small N for blobs)."""
    if not prev or not curr:
        return {}
    used_p = set()
    mapping: Dict[int, int] = {}
    for ci, (cx, cy) in enumerate(curr):
        best = None
        best_d = 1e18
        for pi, (px, py) in enumerate(prev):
            if pi in used_p:
                continue
            d = (cx - px) ** 2 + (cy - py) ** 2
            if d < best_d:
                best_d = d
                best = pi
        if best is not None and best_d < 180.0**2:  # px gate against spurious jumps between frames
            used_p.add(best)
            mapping[ci] = best
    return mapping


@dataclass
class SmoothScalar:
    value: float = 0.0
    alpha: float = 0.12

    def update(self, target: float) -> float:
        self.value = self.alpha * target + (1.0 - self.alpha) * self.value
        return self.value


@dataclass
class AjiSugarcoat:
    """Vibe-dependent smoothing + subtle biases (OSC policy only)."""

    vibe: str
    cutoff: SmoothScalar = field(default_factory=SmoothScalar)
    resonance: SmoothScalar = field(default_factory=SmoothScalar)
    lfo: SmoothScalar = field(default_factory=SmoothScalar)
    scatter: SmoothScalar = field(default_factory=SmoothScalar)

    def __post_init__(self) -> None:
        if self.vibe == "precise":
            for s in (self.cutoff, self.resonance, self.lfo, self.scatter):
                s.alpha = 0.08
        elif self.vibe == "chaotic":
            for s in (self.cutoff, self.resonance, self.lfo, self.scatter):
                s.alpha = 0.22


def map_blob_to_osc_targets(
    area: float,
    speed: float,
    n_blobs: int,
    vibe: str,
) -> Tuple[float, float, float, float]:
    """
    Returns cutoff_hz, resonance_q_norm, lfo_hz_norm01, scatter_norm01.
    Heuristic "sugarcoat" — tune for your DAW mapping.
    """
    # Area → subtle cutoff (wide band; receiver can scale)
    cutoff = float(np.clip(400.0 + math.sqrt(area + 1.0) * 42.0, 200.0, 14_000.0))
    if vibe == "precise":
        cutoff = min(cutoff * 1.04, 14_000.0)  # subtle warmth up
    resonance = float(np.clip(math.log1p(area) / 12.0, 0.05, 1.0))
    lfo = float(np.clip(speed / 80.0, 0.0, 1.0))
    scatter = float(np.clip((n_blobs - 1) * 0.12 + speed / 120.0, 0.0, 1.0))
    if vibe == "chaotic":
        scatter = min(1.0, scatter * 0.85)
        resonance = max(0.05, resonance * 0.92)
    return cutoff, resonance, lfo, scatter


def main() -> None:
    args = parse_args()
    cap = open_capture(args.source)
    detector = make_blob_detector(args.min_area, args.max_area) if args.mode == "blob" else None
    client = udp_client.SimpleUDPClient(args.osc_host, args.osc_port)
    sugar = AjiSugarcoat(vibe=args.vibe)

    prev_pts: List[Tuple[float, float]] = []
    prev_t = time.perf_counter()
    min_frame_interval = 1.0 / args.max_fps if args.max_fps and args.max_fps > 0 else 0.0
    last_process = 0.0

    osc_paths = (
        "/alchemist/subtle/cutoff",
        "/alchemist/subtle/resonance",
        "/alchemist/subtle/lfo_rate",
        "/alchemist/subtle/scatter",
    )

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            now = time.perf_counter()
            if min_frame_interval > 0 and now - last_process < min_frame_interval:
                if not args.no_preview:
                    cv2.imshow("Alchemist Lava–Aji", frame)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
                continue
            last_process = now

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (7, 7), 0)

            if args.mode == "blob":
                assert detector is not None
                keypoints = detector.detect(gray)
                curr_pts = [(float(kp.pt[0]), float(kp.pt[1])) for kp in keypoints]
                areas = [float(kp.size) ** 2 * math.pi for kp in keypoints]
            else:
                curr_pts, areas, keypoints = extract_contour_features(
                    gray, args.min_area, args.max_area, args.contour_max
                )

            dt = max(now - prev_t, 1e-4)
            prev_t = now

            match = match_keypoints_greedy(prev_pts, curr_pts)

            speeds: List[float] = []
            for ci, (x, y) in enumerate(curr_pts):
                pi = match.get(ci)
                if pi is not None and pi < len(prev_pts):
                    px, py = prev_pts[pi]
                    speeds.append(math.hypot(x - px, y - py) / dt)
            mean_speed = float(np.mean(speeds)) if speeds else 0.0

            primary_area = max(areas) if areas else 0.0

            c0, r0, l0, s0 = map_blob_to_osc_targets(
                primary_area, mean_speed, len(curr_pts), args.vibe
            )
            cutoff = sugar.cutoff.update(c0)
            resonance = sugar.resonance.update(r0)
            lfo = sugar.lfo.update(l0)
            scatter = sugar.scatter.update(s0)

            client.send_message(osc_paths[0], cutoff)
            client.send_message(osc_paths[1], resonance)
            client.send_message(osc_paths[2], lfo)
            client.send_message(osc_paths[3], scatter)

            prev_pts = curr_pts

            if not args.no_preview:
                vis = cv2.drawKeypoints(
                    frame,
                    keypoints,
                    np.array([]),
                    (0, 255, 180),
                    cv2.DRAW_MATCHES_FLAGS_DRAW_RICH_KEYPOINTS,
                )
                cv2.imshow("Alchemist Lava–Aji", vis)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
    except KeyboardInterrupt:
        pass
    finally:
        cap.release()
        if not args.no_preview:
            cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
