"""Purge old public applications and orphaned student records.

Run with a scheduled host task (daily is recommended):
    docker compose exec application-service python -m app.purge_expired_applications

Requests older than PURGE_APPLICATIONS_AFTER_DAYS are removed unless they
still have an active assignment. Internal notes and dependent sessions are
removed with the application. Student records are removed only when no
mentorship or tutoring request still references them.
"""
import os
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_

from app.db import SessionLocal
from app.models import (
    InternalNote,
    MentorAssignment,
    MentorshipApplication,
    Student,
    TutorAssignment,
    TutoringApplication,
)


def cutoff_date() -> datetime:
    raw_days = os.getenv("PURGE_APPLICATIONS_AFTER_DAYS", "365")
    try:
        days = int(raw_days)
    except ValueError as exc:
        raise ValueError("PURGE_APPLICATIONS_AFTER_DAYS must be an integer") from exc
    if days < 30:
        raise ValueError("Retention period must be at least 30 days")
    return datetime.now(timezone.utc) - timedelta(days=days)


def has_active_mentorship(db, application_id: int) -> bool:
    today = datetime.now(timezone.utc).date()
    return (
        db.query(MentorAssignment.id)
        .filter(
            MentorAssignment.application_id == application_id,
            MentorAssignment.status == "active",
            or_(MentorAssignment.end_date.is_(None), MentorAssignment.end_date >= today),
        )
        .first()
        is not None
    )


def has_active_tutoring(db, application_id: int) -> bool:
    today = datetime.now(timezone.utc).date()
    return (
        db.query(TutorAssignment.id)
        .filter(
            TutorAssignment.application_id == application_id,
            TutorAssignment.status == "active",
            or_(TutorAssignment.end_date.is_(None), TutorAssignment.end_date >= today),
        )
        .first()
        is not None
    )


def student_is_referenced(db, student_id: int) -> bool:
    mentorship_exists = (
        db.query(MentorshipApplication.id)
        .filter(MentorshipApplication.student_id == student_id)
        .first()
        is not None
    )
    tutoring_exists = (
        db.query(TutoringApplication.id)
        .filter(TutoringApplication.student_id == student_id)
        .first()
        is not None
    )
    return mentorship_exists or tutoring_exists


def purge_expired_applications() -> tuple[int, int, int]:
    cutoff = cutoff_date()
    db = SessionLocal()
    removed_mentorship = 0
    removed_tutoring = 0
    removed_students = 0

    try:
        old_mentorship = (
            db.query(MentorshipApplication)
            .filter(MentorshipApplication.created_at < cutoff)
            .all()
        )
        for application in old_mentorship:
            if has_active_mentorship(db, application.id):
                continue
            student_id = application.student_id
            db.query(InternalNote).filter(
                InternalNote.application_type == "mentorship",
                InternalNote.application_id == application.id,
            ).delete(synchronize_session=False)
            db.delete(application)
            db.flush()
            if not student_is_referenced(db, student_id):
                student = db.query(Student).filter(Student.id == student_id).first()
                if student is not None:
                    db.delete(student)
                    removed_students += 1
            removed_mentorship += 1

        old_tutoring = (
            db.query(TutoringApplication)
            .filter(TutoringApplication.created_at < cutoff)
            .all()
        )
        for application in old_tutoring:
            if has_active_tutoring(db, application.id):
                continue
            student_id = application.student_id
            db.query(InternalNote).filter(
                InternalNote.application_type == "tutoring",
                InternalNote.application_id == application.id,
            ).delete(synchronize_session=False)
            db.delete(application)
            db.flush()
            if not student_is_referenced(db, student_id):
                student = db.query(Student).filter(Student.id == student_id).first()
                if student is not None:
                    db.delete(student)
                    removed_students += 1
            removed_tutoring += 1

        db.commit()
        print(
            "Retention purge completed: "
            f"{removed_mentorship} mentorship request(s), "
            f"{removed_tutoring} tutoring request(s), "
            f"{removed_students} student record(s) removed."
        )
        return removed_mentorship, removed_tutoring, removed_students
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    purge_expired_applications()
