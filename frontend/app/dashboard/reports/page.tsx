"use client";

import { FormEvent, useEffect, useState } from "react";
import { createStudentReport, fetchStudentMentorReports, fetchStudentReports, type StudentStudyReport, type StudentMentorReport } from "../../../lib/student-auth";
import { formatPortalDate, PortalEmptyState, PortalPageHeading } from "../../../components/student-portal-ui";

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export default function StudentReportsPage() {
  const [reports, setReports] = useState<StudentStudyReport[]>([]);
  const [mentorReports, setMentorReports] = useState<StudentMentorReport[]>([]);
  const [reportDate, setReportDate] = useState(localDate());
  const [minutes, setMinutes] = useState("60");
  const [topics, setTopics] = useState("");
  const [summary, setSummary] = useState("");
  const [blockers, setBlockers] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const [result, mentorResult] = await Promise.all([
      fetchStudentReports(),
      fetchStudentMentorReports(),
    ]);
    setReports(result.items);
    setMentorReports(mentorResult.items);
  }
  useEffect(() => {
    let active = true;
    Promise.all([fetchStudentReports(), fetchStudentMentorReports()])
      .then(([result, mentorResult]) => {
        if (active) {
          setReports(result.items);
          setMentorReports(mentorResult.items);
        }
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "دریافت گزارش‌ها انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      await createStudentReport({
        report_date: reportDate,
        study_minutes: Number(minutes),
        topics,
        summary,
        blockers: blockers || null,
        next_step: nextStep || null,
      });
      setTopics(""); setSummary(""); setBlockers(""); setNextStep("");
      setNotice("گزارش مطالعه با موفقیت ثبت شد.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ثبت گزارش انجام نشد."); }
    finally { setSaving(false); }
  }

  return (
    <div className="student-portal-page">
      <PortalPageHeading eyebrow="STUDY JOURNAL" title="ثبت گزارش" description="گزارش روزانه‌ات را ثبت کن تا روند مطالعه و موانع مسیر قابل پیگیری باشد." />
      {error && <div className="student-portal-alert error" role="alert">{error}</div>}
      {notice && <div className="student-portal-alert success" role="status">{notice}</div>}
      <div className="student-report-layout">
        <form className="student-portal-card student-report-form" onSubmit={submit}>
          <div className="student-portal-card-heading"><span className="student-portal-eyebrow">NEW REPORT</span><h3>گزارش جدید</h3><p>اطلاعات را با توجه به عملکرد واقعی همان روز وارد کن.</p></div>
          <div className="student-portal-form-grid">
            <label><span>تاریخ گزارش</span><input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} required /></label>
            <label><span>زمان مطالعه (دقیقه)</span><input type="number" min="0" max="1440" step="5" value={minutes} onChange={(event) => setMinutes(event.target.value)} required /></label>
            <label className="wide"><span>مباحث مطالعه‌شده</span><input value={topics} onChange={(event) => setTopics(event.target.value)} maxLength={2000} placeholder="مثلاً مکانیک، گراف، ترکیبیات..." required /></label>
            <label className="wide"><span>شرح فعالیت امروز</span><textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={4} maxLength={3000} placeholder="چه کارهایی انجام دادی؟ چه تمرین‌هایی حل کردی؟" required /></label>
            <label className="wide"><span>موانع و سؤالات</span><textarea value={blockers} onChange={(event) => setBlockers(event.target.value)} rows={3} maxLength={2000} placeholder="کجا به مشکل برخوردی؟ (اختیاری)" /></label>
            <label className="wide"><span>اقدام بعدی</span><textarea value={nextStep} onChange={(event) => setNextStep(event.target.value)} rows={2} maxLength={1000} placeholder="برای جلسه یا روز بعد چه کاری باید انجام شود؟ (اختیاری)" /></label>
          </div>
          <button type="submit" className="student-portal-button primary full" disabled={saving || topics.trim().length < 2 || summary.trim().length < 2}>{saving ? "در حال ثبت..." : "ثبت گزارش"}</button>
        </form>
        <section className="student-portal-card student-report-history">
          <div className="student-portal-card-heading"><span className="student-portal-eyebrow">MY HISTORY</span><h3>گزارش‌های قبلی</h3><p>آخرین گزارش‌های ثبت‌شده در حساب تو.</p></div>
          {loading ? <div className="student-portal-loading compact">در حال دریافت گزارش‌ها...</div> : reports.length ? (
            <div className="student-report-list">
              {reports.map((report) => (
                <article key={report.id} className="student-report-item">
                  <div className="student-report-item-top"><strong>{formatPortalDate(report.report_date)}</strong><span>{Math.floor(report.study_minutes / 60)} ساعت و {report.study_minutes % 60} دقیقه</span></div>
                  <small>{report.topics}</small><p>{report.summary}</p>
                  {report.blockers && <div className="student-report-note"><b>موانع:</b> {report.blockers}</div>}
                  {report.next_step && <div className="student-report-note"><b>گام بعدی:</b> {report.next_step}</div>}
                </article>
              ))}
            </div>
          ) : <PortalEmptyState icon="▤" title="هنوز گزارشی ثبت نشده" description="با ثبت اولین گزارش، سابقه فعالیتت در این قسمت نمایش داده می‌شود." />}
        </section>
      </div>
      <section className="student-portal-card">
        <div className="student-portal-card-heading"><span className="student-portal-eyebrow">MENTOR FEEDBACK</span><h3>بازخوردهای منتور</h3><p>گزارش هفتگی منتور اختصاصی پس از ثبت در این قسمت قابل مشاهده است.</p></div>
        {mentorReports.length ? <div className="student-report-list">
          {mentorReports.map((report) => <article key={report.id} className="student-report-item">
            <div className="student-report-item-top"><strong>هفته {report.week_number.toLocaleString("fa-IR")}</strong><span>{formatPortalDate(report.created_at)} · {report.mentor_name || "منتور اختصاصی"}</span></div>
            <p>{report.content}</p>
          </article>)}
        </div> : <PortalEmptyState icon="◎" title="هنوز بازخوردی از منتور ثبت نشده" description="پس از شروع منتورینگ و ثبت گزارش هفتگی، ارزیابی و پیشنهادهای منتور را اینجا می‌بینی." />}
      </section>
    </div>
  );
}
