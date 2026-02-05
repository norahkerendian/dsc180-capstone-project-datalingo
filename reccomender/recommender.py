"""Minimal recommender policy for DataLingo."""

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel


class LessonMeta(BaseModel):
    """Minimal curriculum metadata used by the recommender."""
    lesson_id: int
    title: Optional[str] = None
    module_id: Optional[str] = None
    module_title: Optional[str] = None
    concept_tags: list[str] = []
    difficulty: Optional[float] = None
    prerequisite_lesson_ids: list[int] = []
    estimated_duration: Optional[int] = None


class UserLessonProgress(BaseModel):
    """User progress snapshot for a lesson."""
    lesson_id: int
    status: str  # not_started / in_progress / completed
    attempts: Optional[int] = None
    rolling_accuracy: Optional[float] = None
    time_spent: Optional[float] = None
    last_activity_ts: Optional[str] = None


class UserConceptMastery(BaseModel):
    """Per-concept mastery and recency."""
    concept_tag: str
    mastery: float  # 0-1
    last_practiced_ts: Optional[str] = None
    attempts: Optional[int] = None


class RecommendationRequest(BaseModel):
    """Request body for `POST /recommendations`."""
    lessons: list[LessonMeta]
    user_lesson_progress: list[UserLessonProgress]
    user_concept_mastery: list[UserConceptMastery]
    max_results: int = 3
    now_ts: Optional[str] = None


class Recommendation(BaseModel):
    """Recommendation output for the frontend."""
    type: str  # Continue / Review / Progress
    lesson_id: Optional[int] = None
    concept_tag: Optional[str] = None
    explanation: str


def _parse_ts(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _decayed_mastery(mastery: float, last_practiced: Optional[datetime], now: datetime) -> float:
    if mastery is None:
        return 0.0
    if not last_practiced:
        return mastery
    days = max((now - last_practiced).total_seconds() / 86400.0, 0.0)
    # Simple, bounded decay so stale concepts bubble up for review.
    decay = min(0.30, (days / 30.0) * 0.30)
    return max(0.0, mastery - decay)


def _lesson_difficulty(lesson: LessonMeta) -> float:
    return float(lesson.difficulty) if lesson.difficulty is not None else 1.0


def _difficulty_match_score(lesson_difficulty: float, target: float) -> float:
    # Score in [0,1], where 1 is perfect match.
    return max(0.0, 1.0 - (abs(lesson_difficulty - target) / max(target, 1.0)))


def compute_recommendations(request: RecommendationRequest) -> list[Recommendation]:
    """
    Return 1-3 recommendations: Continue, Review, Progress.
    This is a minimal, explainable policy aligned with the project layout.
    """
    now = _parse_ts(request.now_ts) or datetime.now(timezone.utc)
    max_results = max(1, min(request.max_results, 3))

    progress_by_lesson = {p.lesson_id: p for p in request.user_lesson_progress}
    completed_ids = {
        p.lesson_id
        for p in request.user_lesson_progress
        if p.status == "completed"
    }

    recommendations: list[Recommendation] = []

    # Step 1: Continue
    in_progress = [
        p for p in request.user_lesson_progress if p.status == "in_progress"
    ]
    if in_progress:
        in_progress.sort(
            key=lambda p: _parse_ts(p.last_activity_ts)
            or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )
        lesson_id = in_progress[0].lesson_id
        recommendations.append(
            Recommendation(
                type="Continue",
                lesson_id=lesson_id,
                explanation="You have an in-progress lesson. Pick up where you left off.",
            )
        )

    # Step 2: Review
    if len(recommendations) < max_results and request.user_concept_mastery:
        mastery_scores: list[tuple[float, UserConceptMastery]] = []
        for concept in request.user_concept_mastery:
            last_ts = _parse_ts(concept.last_practiced_ts)
            decayed = _decayed_mastery(concept.mastery, last_ts, now)
            mastery_scores.append((decayed, concept))

        mastery_scores.sort(key=lambda item: item[0])
        weakest_score, weakest = mastery_scores[0]
        recency_note = "recently" if weakest_score < weakest.mastery else "a while"
        recommendations.append(
            Recommendation(
                type="Review",
                concept_tag=weakest.concept_tag,
                explanation=(
                    f"You seem weaker on {weakest.concept_tag} ({recency_note} since practice)."
                ),
            )
        )

    # Step 3: Progress
    if len(recommendations) < max_results and request.lessons:
        # Estimate user level from average mastery.
        if request.user_concept_mastery:
            avg_mastery = sum(c.mastery for c in request.user_concept_mastery) / max(
                len(request.user_concept_mastery), 1
            )
        else:
            avg_mastery = 0.5
        target_difficulty = max(1.0, avg_mastery * 5.0)

        lesson_scores: list[tuple[float, LessonMeta]] = []
        for lesson in request.lessons:
            if lesson.lesson_id in completed_ids:
                continue
            prereqs = set(lesson.prerequisite_lesson_ids or [])
            if prereqs and not prereqs.issubset(completed_ids):
                continue

            tags = lesson.concept_tags or []
            if request.user_concept_mastery and tags:
                mastery_map = {c.concept_tag: c.mastery for c in request.user_concept_mastery}
                low_mastery_score = sum(1.0 - mastery_map.get(t, 0.5) for t in tags) / len(tags)
            else:
                low_mastery_score = 0.5

            difficulty_score = _difficulty_match_score(
                _lesson_difficulty(lesson), target_difficulty
            )

            recent = progress_by_lesson.get(lesson.lesson_id)
            failure_penalty = 0.0
            if recent and recent.rolling_accuracy is not None:
                failure_penalty = max(0.0, 0.6 - recent.rolling_accuracy)

            score = low_mastery_score * 0.6 + difficulty_score * 0.4 - failure_penalty
            lesson_scores.append((score, lesson))

        if lesson_scores:
            lesson_scores.sort(key=lambda item: item[0], reverse=True)
            best = lesson_scores[0][1]
            recommendations.append(
                Recommendation(
                    type="Progress",
                    lesson_id=best.lesson_id,
                    explanation=(
                        "Prereqs are met and the lesson matches your current level."
                    ),
                )
            )

    return recommendations[:max_results]
