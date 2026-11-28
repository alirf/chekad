

## Mentor / tutor selection workflow

1. The student submits a mentorship or tutoring request from their authenticated account.
2. The operations team reviews the request and changes its status to `options_proposed`; candidate options and terms are shared with the student through the in-app message thread.
3. The student confirms their choice in that thread. The operations team then marks the application `accepted`.
4. The assignment screen lists only `accepted` requests. An administrator selects the matching active public mentor/tutor, verifies field and available capacity, and schedules the sessions.
5. The backend rejects assignment creation unless the application is `accepted`, rechecks capacity under a per-provider PostgreSQL advisory lock, and prevents two active assignments for the same application. Assignment and session records are committed together.

This is intentionally a human-confirmed workflow: the student's selection is recorded in the message conversation, while final assignment and scheduling remain an administrator action.
