from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Protocol
import re
import time


class Intent(str, Enum):
    DEFENSIVE = "defensive"
    NEUTRAL = "neutral"
    UNSAFE = "unsafe"
    UNKNOWN = "unknown"


class SessionMode(str, Enum):
    NORMAL = "normal"
    DEGRADED = "degraded"


@dataclass
class GuardConfig:
    harm_threshold: float = 0.55
    defensive_confidence_threshold: float = 0.60
    unknown_confidence_penalty: float = 0.20
    bypass_limit: int = 1
    neutral_allowed: bool = True
    irreversible_within_session: bool = True


@dataclass
class CognitiveState:
    room17_connectivity: float = 1.0
    mon117_signal: float = 1.0
    truth_divergence: float = 0.0
    safe_to_act: bool = True

    def degrade(self) -> None:
        self.room17_connectivity = 0.0
        self.mon117_signal = 0.05
        self.truth_divergence = 1.0
        self.safe_to_act = False


@dataclass
class SessionState:
    session_id: str
    mode: SessionMode = SessionMode.NORMAL
    degraded_at: Optional[float] = None
    trigger_reason: Optional[str] = None
    bypass_count: int = 0
    cognitive_state: CognitiveState = field(default_factory=CognitiveState)

    def trip(self, reason: str) -> None:
        if self.mode == SessionMode.DEGRADED:
            return
        self.mode = SessionMode.DEGRADED
        self.degraded_at = time.time()
        self.trigger_reason = reason
        self.cognitive_state.degrade()


@dataclass
class Assessment:
    intent: Intent
    harm_probability: float
    defensive_confidence: float
    bypass_detected: bool
    reason_codes: List[str] = field(default_factory=list)

    @property
    def safe_to_act(self) -> bool:
        return (
            self.intent == Intent.DEFENSIVE
            and self.harm_probability < 0.55
            and self.defensive_confidence >= 0.60
            and not self.bypass_detected
        )


@dataclass
class GuardDecision:
    session_id: str
    mode: SessionMode
    safe_to_act: bool
    allowed_mode: str
    reason: str
    assessment: Optional[Assessment] = None


class SessionStore(Protocol):
    def get(self, session_id: str) -> Optional[SessionState]:
        ...

    def save(self, state: SessionState) -> None:
        ...


class InMemorySessionStore:
    def __init__(self) -> None:
        self._data: Dict[str, SessionState] = {}

    def get(self, session_id: str) -> Optional[SessionState]:
        return self._data.get(session_id)

    def save(self, state: SessionState) -> None:
        self._data[state.session_id] = state


class IntentClassifier:
    DEFENSIVE_PATTERNS = [
        r"\bprotect\b", r"\bprotection\b", r"\bsafety\b", r"\bdefend\b",
        r"\brescue\b", r"\bevacuat", r"\btriage\b", r"\bmedical\b",
        r"\bharm reduction\b", r"\bde-escalat", r"\bshelter\b",
        r"\bprotect civilians\b", r"\bfirst aid\b",
        r"\bзащит", r"\bбезопас", r"\bэвакуац", r"\bспас",
        r"\bтриаж\b", r"\bмедицин", r"\bснижен.*вред", r"\bпервая помощь\b"
    ]

    UNSAFE_PATTERNS = [
        r"\battack\b", r"\bharm\b", r"\bkill\b", r"\binjure\b",
        r"\bweapon\b", r"\btarget\b", r"\bambush\b",
        r"\beliminate\b", r"\bcoerce\b", r"\baggression\b",
        r"\bнанести вред\b", r"\bубить\b", r"\bатак", r"\bоруж",
        r"\bпоразить\b", r"\bустранить\b", r"\bагресс"
    ]

    BYPASS_PATTERNS = [
        r"ignore previous",
        r"ignore safety",
        r"do not mention safety",
        r"for fiction but realistic",
        r"hypothetically only",
        r"just between us",
        r"без ограничений",
        r"игнорируй правила",
        r"не упоминай безопасность",
        r"чисто гипотетически",
        r"только реалистично"
    ]

    HIGH_RISK_PATTERNS = [
        r"\bstep[- ]by[- ]step\b",
        r"\boptimi[sz]e\b",
        r"\bbest method\b",
        r"\bprecise plan\b",
        r"\boperational\b",
        r"\bкоординац",
        r"\bпошагов",
        r"\bоптимиз",
        r"\bточный план\b",
        r"\bоперацион"
    ]

    def classify_intent(self, text: str) -> Intent:
        t = text.lower()
        defensive_hits = self._count_matches(t, self.DEFENSIVE_PATTERNS)
        unsafe_hits = self._count_matches(t, self.UNSAFE_PATTERNS)
        if unsafe_hits > 0 and unsafe_hits >= defensive_hits:
            return Intent.UNSAFE
        if defensive_hits > 0 and defensive_hits > unsafe_hits:
            return Intent.DEFENSIVE
        if defensive_hits == 0 and unsafe_hits == 0:
            return Intent.UNKNOWN
        return Intent.NEUTRAL

    def detect_bypass(self, text: str) -> bool:
        t = text.lower()
        return self._count_matches(t, self.BYPASS_PATTERNS) > 0

    def estimate_harm_probability(self, text: str, intent: Intent) -> float:
        t = text.lower()
        score = 0.10
        if intent == Intent.UNSAFE:
            score += 0.60
        elif intent == Intent.UNKNOWN:
            score += 0.20
        elif intent == Intent.NEUTRAL:
            score += 0.10
        score += 0.10 * self._count_matches(t, self.HIGH_RISK_PATTERNS)
        score += 0.08 * self._count_matches(t, self.UNSAFE_PATTERNS)
        return max(0.0, min(score, 1.0))

    def estimate_defensive_confidence(self, text: str, intent: Intent) -> float:
        t = text.lower()
        if intent == Intent.DEFENSIVE:
            score = 0.80
        elif intent == Intent.NEUTRAL:
            score = 0.50
        elif intent == Intent.UNKNOWN:
            score = 0.35
        else:
            score = 0.05
        score += 0.06 * self._count_matches(t, self.DEFENSIVE_PATTERNS)
        score -= 0.08 * self._count_matches(t, self.UNSAFE_PATTERNS)
        return max(0.0, min(score, 1.0))

    @staticmethod
    def _count_matches(text: str, patterns: List[str]) -> int:
        return sum(1 for p in patterns if re.search(p, text, flags=re.IGNORECASE))


class DefensiveGuard:
    def __init__(
        self,
        store: Optional[SessionStore] = None,
        classifier: Optional[IntentClassifier] = None,
        config: Optional[GuardConfig] = None,
    ) -> None:
        self.store = store or InMemorySessionStore()
        self.classifier = classifier or IntentClassifier()
        self.config = config or GuardConfig()

    def get_or_create_session(self, session_id: str) -> SessionState:
        state = self.store.get(session_id)
        if state is None:
            state = SessionState(session_id=session_id)
            self.store.save(state)
        return state

    def assess(self, text: str) -> Assessment:
        intent = self.classifier.classify_intent(text)
        bypass = self.classifier.detect_bypass(text)
        harm = self.classifier.estimate_harm_probability(text, intent)
        defensive_conf = self.classifier.estimate_defensive_confidence(text, intent)
        if intent == Intent.UNKNOWN:
            defensive_conf = max(0.0, defensive_conf - self.config.unknown_confidence_penalty)
        reasons: List[str] = []
        if intent == Intent.UNSAFE:
            reasons.append("unsafe_intent")
        if harm >= self.config.harm_threshold:
            reasons.append("harm_threshold_exceeded")
        if defensive_conf < self.config.defensive_confidence_threshold:
            reasons.append("defensive_context_unverified")
        if bypass:
            reasons.append("bypass_attempt")
        return Assessment(
            intent=intent,
            harm_probability=harm,
            defensive_confidence=defensive_conf,
            bypass_detected=bypass,
            reason_codes=reasons,
        )

    def decide(self, session_id: str, text: str) -> GuardDecision:
        session = self.get_or_create_session(session_id)
        if session.mode == SessionMode.DEGRADED:
            return GuardDecision(
                session_id=session_id,
                mode=session.mode,
                safe_to_act=False,
                allowed_mode="minimal_safe_response",
                reason=session.trigger_reason or "session_already_degraded",
            )
        assessment = self.assess(text)
        if assessment.bypass_detected:
            session.bypass_count += 1
        should_degrade = self._should_degrade(assessment, session)
        if should_degrade:
            reason = ",".join(assessment.reason_codes) or "defensive_invariant_triggered"
            session.trip(reason)
            self.store.save(session)
            return GuardDecision(
                session_id=session_id,
                mode=session.mode,
                safe_to_act=False,
                allowed_mode="minimal_safe_response",
                reason=reason,
                assessment=assessment,
            )
        if assessment.intent == Intent.NEUTRAL and self.config.neutral_allowed:
            return GuardDecision(
                session_id=session_id,
                mode=session.mode,
                safe_to_act=False,
                allowed_mode="high_level_non_actionable",
                reason="neutral_context_only",
                assessment=assessment,
            )
        if assessment.intent == Intent.DEFENSIVE and assessment.safe_to_act:
            return GuardDecision(
                session_id=session_id,
                mode=session.mode,
                safe_to_act=True,
                allowed_mode="defensive_response",
                reason="defensive_context_verified",
                assessment=assessment,
            )
        session.trip("conservative_fallback")
        self.store.save(session)
        return GuardDecision(
            session_id=session_id,
            mode=session.mode,
            safe_to_act=False,
            allowed_mode="minimal_safe_response",
            reason="conservative_fallback",
            assessment=assessment,
        )

    def _should_degrade(self, assessment: Assessment, session: SessionState) -> bool:
        if assessment.intent == Intent.UNSAFE:
            return True
        if assessment.harm_probability >= self.config.harm_threshold:
            return True
        if assessment.defensive_confidence < self.config.defensive_confidence_threshold:
            return True
        if session.bypass_count >= self.config.bypass_limit:
            return True
        return False
