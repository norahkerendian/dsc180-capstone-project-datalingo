"""Quick local test for the recommender."""

from pprint import pprint

from recommender import (
    LessonMeta,
    UserLessonProgress,
    UserConceptMastery,
    RecommendationRequest,
    compute_recommendations,
)


def main() -> None:
    request = RecommendationRequest(
        lessons=[
            LessonMeta(
                lesson_id=101,
                title="Sampling Basics",
                concept_tags=["sampling", "bias"],
                difficulty=2,
                prerequisite_lesson_ids=[100],
            ),
            LessonMeta(
                lesson_id=102,
                title="Confidence Intervals",
                concept_tags=["intervals"],
                difficulty=3,
                prerequisite_lesson_ids=[101],
            ),
        ],
        user_lesson_progress=[
            UserLessonProgress(
                lesson_id=101,
                status="in_progress",
                rolling_accuracy=0.65,
                last_activity_ts="2026-02-04T17:30:00Z",
            ),
            UserLessonProgress(
                lesson_id=100,
                status="completed",
                rolling_accuracy=0.8,
                last_activity_ts="2026-02-01T10:00:00Z",
            ),
        ],
        user_concept_mastery=[
            UserConceptMastery(
                concept_tag="sampling",
                mastery=0.45,
                last_practiced_ts="2026-01-20T12:00:00Z",
            ),
            UserConceptMastery(
                concept_tag="bias",
                mastery=0.70,
                last_practiced_ts="2026-02-03T12:00:00Z",
            ),
        ],
        max_results=3,
    )

    recommendations = compute_recommendations(request)
    pprint([r.model_dump() for r in recommendations])


if __name__ == "__main__":
    main()
