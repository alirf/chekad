"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { cancelExamRegistration, fetchStudentExams, registerForExam, StudentExamError, type StudentExam } from "../../../lib/student-exams";
import { formatPortalDateTime, PortalEmptyState, PortalPageHeading, PortalStatus } from "../../../components/student-portal-ui";

const fieldNames = { physics: "المپیاد فیزیک", computer: "المپیاد کامپیوتر" };

export default function StudentExamsPage() {
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const result = await fetchStudentExams();
    setExams(result.items);
  }, []);

  useEffect(() => {
    let active = true;
    fetchStudentExams()
      .then((result) => { if (active) setExams(result.items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "دریافت آزمون‌ها انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function register(exam: StudentExam) {
    setBusyId(exam.id); setError(""); setNotice("");
    try {
      await registerForExam(exam.id);
      setNotice("ثبت‌نام تو در «" + exam.title + "» انجام شد.");
      await load();
    } catch (cause) {
      setError(cause instanceof StudentExamError ? cause.message : "ثبت‌نام آزمون انجام نشد.");
    } finally { setBusyId(null); }
  }

  async function cancel(exam: StudentExam) {
    if (!window.confirm("ثبت‌نام آزمون «" + exam.title + "» لغو شود؟")) return;
    setBusyId(exam.id); setError(""); setNotice("");
    try {
      await cancelExamRegistration(exam.id);
      setNotice("ثبت‌نام آزمون لغو شد.");
      await load();
    } catch (cause) {
      setError(cause instanceof StudentExamError ? cause.message : "لغو ثبت‌نام انجام نشد.");
    } finally { setBusyId(null); }
  }

  const registeredCount = exams.filter((exam) => exam.is_registered).length;
  return (
    <div className="student-portal-page">
      <PortalPageHeading eyebrow="OLYMPIAD EXAMS" title="آزمون‌های من" description="آزمون‌های رشته خودت را ببین و ثبت‌نامت را از همین پنل مدیریت کن." action={<Link className="student-portal-button secondary" href="/exams">صفحه عمومی آزمون‌ها</Link>} />
      {error && <div className="student-portal-alert error" role="alert">{error}</div>}
      {notice && <div className="student-portal-alert success" role="status">{notice}</div>}
      <div className="student-invoice-summary">
        <div><span>آزمون‌های قابل مشاهده</span><strong>{exams.length.toLocaleString("fa-IR")}</strong></div>
        <div><span>ثبت‌نام‌های فعال من</span><strong>{registeredCount.toLocaleString("fa-IR")}</strong></div>
        <div><span>رشته حساب</span><strong>{exams[0] ? fieldNames[exams[0].field] : "—"}</strong></div>
      </div>
      {loading ? <div className="student-portal-loading">در حال دریافت آزمون‌ها...</div> : exams.length ? (
        <div className="student-exam-list">
          {exams.map((exam) => (
            <article key={exam.id} className="student-portal-card student-exam-card">
              <div className="student-exam-card-main">
                <div><span className="student-portal-eyebrow">{fieldNames[exam.field]} · {exam.stage || "آزمون چکاد"}</span><h3>{exam.title}</h3><p>{exam.description || "اطلاعات تکمیلی این آزمون در اطلاعیه رسمی منتشر می‌شود."}</p></div>
                <div className="student-exam-status"><PortalStatus status={exam.is_registered ? "active" : exam.status} />{!exam.is_registered && <small>{exam.status === "closed" ? "مهلت ثبت‌نام پایان‌یافته" : exam.status === "completed" ? "برگزارشده" : exam.status === "upcoming" ? "پیش رو" : "منتشرشده"}</small>}</div>
              </div>
              <div className="student-exam-meta">
                <span>زمان: {exam.starts_at ? (Number.isNaN(Date.parse(exam.starts_at)) ? exam.starts_at : formatPortalDateTime(exam.starts_at)) : "اعلام نشده"}</span>
                <span>مدت: {exam.duration_minutes ? exam.duration_minutes.toLocaleString("fa-IR") + " دقیقه" : "اعلام نشده"}</span>
                {exam.is_registered && exam.registered_at && <span>تاریخ ثبت‌نام: {formatPortalDateTime(exam.registered_at)}</span>}
              </div>
              <div className="student-exam-actions">
                {exam.is_registered ? <button type="button" className="student-portal-button secondary" onClick={() => cancel(exam)} disabled={busyId === exam.id}>{busyId === exam.id ? "در حال انجام..." : "لغو ثبت‌نام"}</button> :
                  <button type="button" className="student-portal-button primary" onClick={() => register(exam)} disabled={!exam.can_register || busyId === exam.id}>{busyId === exam.id ? "در حال ثبت..." : "ثبت‌نام در آزمون"}</button>}
                {exam.registration_url && <a className="student-portal-button secondary" href={exam.registration_url} target="_blank" rel="noreferrer">اطلاعیه / جزئیات</a>}
              </div>
            </article>
          ))}
        </div>
      ) : <PortalEmptyState icon="◇" title="آزمونی برای رشته حساب منتشر نشده" description="با انتشار آزمون فیزیک یا کامپیوتر در پنل مدیریت، امکان مشاهده و ثبت‌نام از این بخش فراهم می‌شود." action={<Link className="student-portal-button secondary" href="/exams">مشاهده صفحه آزمون‌ها</Link>} />}
      <p className="student-portal-muted">ثبت‌نام در این بخش به معنی شرکت آنلاین یا صدور کارنامه نیست؛ سامانه فعلاً فقط سابقه ثبت‌نام را نگهداری می‌کند.</p>
    </div>
  );
}
