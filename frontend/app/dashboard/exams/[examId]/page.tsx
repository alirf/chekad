"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  fetchStudentExamAttempt, fetchStudentExamResult, saveStudentExamAnswers,
  startStudentExam, submitStudentExam, StudentExamError,
  type StudentExamAttempt, type StudentExamQuestion, type StudentExamResult,
} from "../../../../lib/student-exams";
import { formatPortalDateTime, PortalEmptyState, PortalPageHeading } from "../../../../components/student-portal-ui";

export default function StudentOnlineExamPage() {
  const params = useParams<{ examId: string }>();
  const examId = Number(params.examId);
  const [attempt, setAttempt] = useState<StudentExamAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<StudentExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now());

  const loadAttempt = useCallback(async () => {
    const current = await fetchStudentExamAttempt(examId);
    setAttempt(current);
    const values: Record<number, string> = {};
    for (const question of current.questions || []) values[question.id] = question.answer_text || "";
    setAnswers(values);
    if (current.status === "graded" && current.results_published) setResult(await fetchStudentExamResult(examId));
    else setResult(null);
  }, [examId]);

  useEffect(() => {
    if (!Number.isSafeInteger(examId) || examId < 1) {
      setError("شناسه آزمون معتبر نیست.");
      setLoading(false);
      return;
    }
    let active = true;
    fetchStudentExamAttempt(examId).then(async (current) => {
      if (!active) return;
      setAttempt(current);
      const values: Record<number, string> = {};
      for (const question of current.questions || []) values[question.id] = question.answer_text || "";
      setAnswers(values);
      if (current.status === "graded" && current.results_published) {
        const report = await fetchStudentExamResult(examId);
        if (active) setResult(report);
      }
    }).catch((cause) => {
      if (active && !(cause instanceof StudentExamError && cause.status === 404)) {
        setError(cause instanceof Error ? cause.message : "دریافت آزمون انجام نشد.");
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [examId]);

  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [attempt?.status, attempt?.deadline_at]);

  const questions = attempt?.questions || [];
  const remainingMs = attempt?.deadline_at ? Math.max(0, new Date(attempt.deadline_at).getTime() - now) : 0;
  const remaining = useMemo(() => {
    const seconds = Math.floor(remainingMs / 1000);
    return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
      .map((part) => String(part).padStart(2, "0")).join(":");
  }, [remainingMs]);
  const expired = Boolean(attempt?.status === "in_progress" && remainingMs <= 0);
  const editable = attempt?.status === "in_progress" && !expired;
  const answeredCount = questions.filter((question) => Boolean((answers[question.id] || "").trim())).length;

  async function begin() {
    setBusy(true); setError(""); setNotice("");
    try {
      await startStudentExam(examId);
      await loadAttempt();
      setNotice("آزمون شروع شد. زمان باقی‌مانده را در بالای صفحه دنبال کن.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "شروع آزمون انجام نشد."); }
    finally { setBusy(false); }
  }

  async function saveAnswers() {
    if (!attempt || !editable) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await saveStudentExamAnswers(examId, questions.map((question) => ({
        question_id: question.id, answer_text: answers[question.id] || "",
      })));
      setNotice("پاسخ‌ها با موفقیت ذخیره شدند.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ذخیره پاسخ‌ها انجام نشد."); }
    finally { setBusy(false); }
  }

  async function submitAttempt() {
    if (!attempt || attempt.status !== "in_progress") return;
    if (!window.confirm("پس از تحویل برگه، امکان تغییر پاسخ‌ها وجود ندارد. آزمون تحویل داده شود؟")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (!expired) {
        await saveStudentExamAnswers(examId, questions.map((question) => ({
          question_id: question.id, answer_text: answers[question.id] || "",
        })));
      }
      const response = await submitStudentExam(examId);
      await loadAttempt();
      setNotice(response.status === "graded"
        ? "آزمون تحویل شد. کارنامه پس از انتشار رسمی قابل مشاهده است."
        : "آزمون تحویل شد و پاسخ‌های تشریحی در صف تصحیح قرار گرفتند.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تحویل آزمون انجام نشد."); }
    finally { setBusy(false); }
  }

  async function checkResult() {
    setBusy(true); setError(""); setNotice("");
    try {
      await loadAttempt();
      const report = await fetchStudentExamResult(examId);
      setResult(report);
      setNotice("کارنامه دریافت شد.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "کارنامه هنوز منتشر نشده است."); }
    finally { setBusy(false); }
  }

  return (
    <div className="student-portal-page">
      <PortalPageHeading
        eyebrow="ONLINE OLYMPIAD EXAM"
        title={attempt?.exam_title || "شرکت در آزمون"}
        description="پاسخ‌ها در حساب دانش‌آموزی ذخیره می‌شوند؛ سؤال‌های چهارگزینه‌ای خودکار تصحیح و پاسخ‌های تشریحی توسط تیم علمی بررسی می‌شوند."
        action={<Link className="student-portal-button secondary" href="/dashboard/exams">بازگشت به آزمون‌ها</Link>}
      />
      {error && <div className="student-portal-alert error" role="alert">{error}</div>}
      {notice && <div className="student-portal-alert success" role="status">{notice}</div>}
      {loading ? <div className="student-portal-loading">در حال بارگذاری آزمون...</div> : result ? (
        <section className="student-portal-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><span className="student-portal-eyebrow">OFFICIAL RESULT</span><h2 className="mt-1 text-lg font-black text-slate-900">{result.exam_title}</h2></div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">کارنامه منتشرشده</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4"><small className="text-xs text-slate-500">نمره کسب‌شده</small><strong className="mt-2 block text-xl text-slate-900">{result.earned_score} / {result.max_score}</strong></div>
            <div className="rounded-xl bg-slate-50 p-4"><small className="text-xs text-slate-500">درصد</small><strong className="mt-2 block text-xl text-slate-900">{result.percentage.toLocaleString("fa-IR")}٪</strong></div>
            <div className="rounded-xl bg-slate-50 p-4"><small className="text-xs text-slate-500">تاریخ تحویل</small><strong className="mt-2 block text-sm text-slate-900">{formatPortalDateTime(result.submitted_at)}</strong></div>
          </div>
          <div className="grid gap-3">
            {result.answers.map((answer) => <article key={answer.question_id} className="rounded-xl border border-slate-100 p-4">
              <strong className="text-xs text-slate-800">سؤال {answer.position.toLocaleString("fa-IR")} · {answer.prompt}</strong>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-7 text-slate-600">پاسخ تو: {answer.answer_text || "بدون پاسخ"}</p>
              {answer.correct_answer && <p className="mt-1 text-xs text-emerald-700">پاسخ صحیح: {answer.correct_answer}</p>}
              <p className="mt-2 text-[10px] text-slate-500">نمره: {answer.earned_points ?? "—"} از {answer.max_points}</p>
              {answer.grader_note && <p className="mt-2 rounded-lg bg-blue-50 p-3 text-xs leading-6 text-blue-800">بازخورد مصحح: {answer.grader_note}</p>}
            </article>)}
          </div>
        </section>
      ) : !attempt ? (
        <section className="student-portal-card space-y-4">
          <div><span className="student-portal-eyebrow">BEFORE YOU START</span><h2 className="mt-1 text-lg font-black text-slate-900">آماده شروع آزمون هستی؟</h2><p className="mt-2 text-sm leading-7 text-slate-500">با شروع آزمون، زمان‌سنج فعال می‌شود و یک تلاش به حساب تو اختصاص می‌یابد. شروع مجدد پس از تحویل یا پایان زمان امکان‌پذیر نیست.</p></div>
          <button type="button" onClick={begin} disabled={busy} className="student-portal-button primary">{busy ? "در حال شروع..." : "شروع آزمون"}</button>
        </section>
      ) : attempt.status === "in_progress" ? (
        <>
          <section className="student-portal-card flex flex-wrap items-center justify-between gap-3">
            <div><span className="student-portal-eyebrow">TIME REMAINING</span><strong className="mt-1 block font-mono text-2xl text-slate-900">{remaining}</strong><small className="text-xs text-slate-500">پاسخ‌داده‌شده: {answeredCount.toLocaleString("fa-IR")} از {questions.length.toLocaleString("fa-IR")}</small></div>
            <div className="text-left"><small className="block text-xs text-slate-500">مهلت تحویل</small><strong className="text-xs text-slate-700">{formatPortalDateTime(attempt.deadline_at)}</strong></div>
          </section>
          {expired && <div className="student-portal-alert error" role="alert">زمان آزمون تمام شده است. برگه را تحویل بده تا پاسخ‌ها نهایی شوند.</div>}
          <div className="grid gap-4">
            {questions.map((question: StudentExamQuestion) => <article key={question.id} className="student-portal-card space-y-3">
              <div className="flex items-center justify-between gap-3"><strong className="text-sm text-slate-800">سؤال {question.position.toLocaleString("fa-IR")}</strong><span className="text-xs text-slate-500">{question.points.toLocaleString("fa-IR")} نمره · {question.question_type === "single_choice" ? "چهارگزینه‌ای" : "تشریحی"}</span></div>
              <p className="whitespace-pre-wrap text-sm leading-8 text-slate-700">{question.prompt}</p>
              {question.question_type === "single_choice" ? (
                <div className="grid gap-2">
                  {(question.options || []).map((option) => <label key={option} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 p-3 text-sm text-slate-700">
                    <input type="radio" name={"question-" + question.id} value={option} checked={(answers[question.id] || "") === option} disabled={!editable || busy} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))} />
                    <span>{option}</span>
                  </label>)}
                </div>
              ) : <textarea value={answers[question.id] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} disabled={!editable || busy} rows={5} maxLength={12000} placeholder="پاسخ تشریحی خود را بنویس..." className="w-full rounded-xl border border-slate-200 p-3 text-sm leading-7 outline-none focus:border-blue-400 disabled:bg-slate-50" />}
            </article>)}
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={saveAnswers} disabled={busy || !editable} className="student-portal-button secondary">ذخیره پاسخ‌ها</button>
            <button type="button" onClick={submitAttempt} disabled={busy} className="student-portal-button primary">{busy ? "در حال ثبت..." : "تحویل نهایی آزمون"}</button>
          </div>
        </>
      ) : (
        <section className="student-portal-card space-y-3">
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">برگه تحویل شده</span>
          <h2 className="text-lg font-black text-slate-900">{attempt.status === "graded" ? "تصحیح انجام شده" : "در انتظار تصحیح پاسخ‌های تشریحی"}</h2>
          <p className="text-sm leading-7 text-slate-500">پس از تکمیل تصحیح و انتشار رسمی کارنامه، نتیجه و بازخورد هر سؤال در همین صفحه نمایش داده می‌شود.</p>
          <button type="button" disabled={busy} onClick={checkResult} className="student-portal-button secondary">{busy ? "در حال بررسی..." : "بررسی کارنامه"}</button>
        </section>
      )}
    </div>
  );
}
