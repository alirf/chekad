"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ApiError, submitPublicApplication } from "../lib/api";
import { fetchStudentProfile, StudentAuthError, type StudentProfile, type OlympiadField } from "../lib/student-auth";

type RequestKind = "mentorship" | "tutoring";

export function RequestForm({ kind, enabled }: { kind: RequestKind; enabled: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [level, setLevel] = useState("");
  const [goal, setGoal] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ requestId: number; message: string } | null>(null);

  const isMentorship = kind === "mentorship";

  useEffect(() => {
    let active = true;
    fetchStudentProfile()
      .then((profile) => {
        if (active) setStudent(profile);
      })
      .catch((cause) => {
        if (!active) return;
        setProfileError(
          cause instanceof StudentAuthError && cause.status === 401
            ? "برای ثبت درخواست باید وارد حساب دانش‌آموزی خود شوی."
            : cause instanceof Error
              ? cause.message
              : "دریافت اطلاعات حساب انجام نشد.",
        );
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });
    return () => { active = false; };
  }, []);

  function goToNextStep() {
    if (formRef.current?.reportValidity()) {
      setError("");
      setStep(2);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    if (!form.reportValidity() || submitting || !student) return;

    if (!guardianConsent || !privacyAccepted) {
      setError("تأیید رضایت ولی یا سرپرست و پذیرش اطلاعیه حریم خصوصی الزامی است.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitPublicApplication(kind, {
        first_name: student.first_name,
        last_name: student.last_name,
        grade: student.grade,
        field: student.field as OlympiadField,
        guardian_phone: student.guardian_phone,
        guardian_consent: true,
        privacy_accepted: true,
        ...(isMentorship ? { level: level || undefined } : { topic }),
        goal: goal || undefined,
        notes: notes || undefined,
      });

      setSuccess({ requestId: result.request_id, message: result.message });
      form.reset();
    } catch (submissionError) {
      setError(
        submissionError instanceof ApiError
          ? submissionError.message
          : "خطای پیش‌بینی‌نشده رخ داد. وضعیت ثبت درخواست را پیگیری کنید.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!enabled) {
    return (
      <section className="request-form request-disabled" aria-live="polite">
        <span className="eyebrow">REQUEST INTAKE</span>
        <span className="disabled-icon" aria-hidden="true">⌁</span>
        <h2>ثبت درخواست هنوز فعال نشده است.</h2>
        <p>چکاد باید ابتدا راه ارتباطی مسئول حریم خصوصی و نشانی رسمی وب‌سایت را در تنظیمات سرور ثبت و فعال‌سازی را تأیید کند. تا آن زمان، هیچ اطلاعاتی از شما دریافت نمی‌شود.</p>
        <Link className="button button-secondary" href="/privacy">مشاهده اطلاعیه حریم خصوصی</Link>
      </section>
    );
  }

  if (profileLoading) {
    return <section className="request-form request-disabled" aria-live="polite"><p>در حال بررسی حساب دانش‌آموزی...</p></section>;
  }

  if (!student) {
    return (
      <section className="request-form request-disabled request-login-required" aria-live="polite">
        <span className="eyebrow">STUDENT ACCOUNT REQUIRED</span>
        <span className="disabled-icon" aria-hidden="true">◎</span>
        <h2>درخواستت را از داخل حساب دانش‌آموزی ثبت کن.</h2>
        <p>{profileError || "ابتدا وارد حساب شو تا درخواست منتورینگ یا کلاس خصوصی به پرونده خودت متصل شود و بعداً بتوانی وضعیت آن را در پنل پیگیری کنی."}</p>
        <div className="request-auth-actions">
          <Link className="button button-primary" href="/login">ورود به حساب</Link>
          <Link className="button button-secondary" href="/register">ساخت حساب دانش‌آموزی</Link>
        </div>
      </section>
    );
  }

  if (success) {
    return (
      <section className="request-form request-success" aria-live="polite">
        <span className="success-icon" aria-hidden="true">✓</span>
        <span className="eyebrow">REQUEST RECEIVED</span>
        <h2>درخواستت ثبت شد.</h2>
        <p>{success.message}</p>
        <div className="request-reference">
          <span>کد پیگیری</span>
          <strong dir="ltr">CH-{String(success.requestId).padStart(6, "0")}</strong>
        </div>
        <p className="form-footnote">درخواست به حساب دانش‌آموزی تو متصل شد. از پنل دانش‌آموزی می‌توانی کد پیگیری و آخرین وضعیت آن را ببینی.</p>
        <Link className="button button-primary" href="/dashboard">رفتن به پنل دانش‌آموزی</Link>
      </section>
    );
  }

  const fieldLabel = student.field === "physics" ? "المپیاد فیزیک" : "المپیاد کامپیوتر";

  return (
    <form ref={formRef} className="request-form" onSubmit={handleSubmit} noValidate>
      <div className="form-heading">
        <span className="eyebrow">{isMentorship ? "فرم درخواست منتورینگ" : "فرم درخواست کلاس خصوصی"}</span>
        <h2>{step === 1 ? "مشخصات حساب تو" : "نیاز و هدف را دقیق‌تر توضیح بده."}</h2>
        <p>درخواست به حساب فعلی متصل می‌شود. مشخصات دانش‌آموز و شماره سرپرست از حساب خوانده می‌شوند و امکان تغییر آن‌ها در این فرم وجود ندارد.</p>
      </div>

      <div className="form-progress" aria-label={step === 1 ? "مرحله اول از دو مرحله" : "مرحله دوم از دو مرحله"}>
        <div className={step === 1 ? "form-progress-item is-active" : "form-progress-item is-complete"}><span>۱</span>مشخصات حساب</div>
        <i className={step === 2 ? "is-complete" : ""} />
        <div className={step === 2 ? "form-progress-item is-active" : "form-progress-item"}><span>۲</span>نیاز و تأیید</div>
      </div>

      {step === 1 ? (
        <div className="form-grid form-step-panel">
          <div className="form-field">
            <label htmlFor="student-first-name">نام دانش‌آموز</label>
            <input id="student-first-name" value={student.first_name} readOnly />
          </div>
          <div className="form-field">
            <label htmlFor="student-last-name">نام خانوادگی</label>
            <input id="student-last-name" value={student.last_name} readOnly />
          </div>
          <div className="form-field">
            <label htmlFor="student-grade">پایه تحصیلی</label>
            <input id="student-grade" value={student.grade} readOnly />
          </div>
          <div className="form-field">
            <label htmlFor="olympiad-field">رشته المپیاد</label>
            <input id="olympiad-field" value={fieldLabel} readOnly />
          </div>
          <div className="form-field form-field-full">
            <label htmlFor="guardian-phone">شماره موبایل ولی یا سرپرست</label>
            <input id="guardian-phone" value={student.guardian_phone} readOnly dir="ltr" />
            <small>برای اصلاح این شماره، ابتدا اطلاعات حساب را از مسیر پشتیبانی چکاد پیگیری کن.</small>
          </div>
        </div>
      ) : (
        <div className="form-grid form-step-panel">
          {isMentorship ? (
            <div className="form-field form-field-full">
              <label htmlFor="student-level">سطح فعلی (اختیاری)</label>
              <select id="student-level" value={level} onChange={(event) => setLevel(event.target.value)}>
                <option value="">انتخاب سطح</option>
                <option value="آشنایی اولیه">آشنایی اولیه</option>
                <option value="در حال مطالعه">در حال مطالعه</option>
                <option value="آمادگی آزمون">آمادگی آزمون</option>
                <option value="مرحله پیشرفته">مرحله پیشرفته</option>
              </select>
            </div>
          ) : (
            <div className="form-field form-field-full">
              <label htmlFor="tutoring-topic">مبحث یا موضوع موردنیاز <span>*</span></label>
              <input id="tutoring-topic" value={topic} onChange={(event) => setTopic(event.target.value)} required minLength={2} maxLength={160} placeholder="مثلاً مکانیک یا ساختمان داده" />
            </div>
          )}

          <div className="form-field form-field-full">
            <label htmlFor="request-goal">{isMentorship ? "هدفت از دریافت منتورینگ چیست؟" : "نوع نیاز آموزشی"}</label>
            <input id="request-goal" value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={180} placeholder={isMentorship ? "مثلاً طراحی برنامه، پیگیری و شناخت مسیر" : "مثلاً آموزش مبحث، حل تمرین یا رفع اشکال"} />
          </div>

          <div className="form-field form-field-full">
            <label htmlFor="request-notes">توضیحات تکمیلی (اختیاری)</label>
            <textarea id="request-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} maxLength={1200} placeholder="اطلاعات غیرحساس و مرتبط با نیاز آموزشی را بنویس..." />
          </div>

          <div className="form-field form-field-full consent-group">
            <label className="consent-check">
              <input type="checkbox" checked={guardianConsent} onChange={(event) => setGuardianConsent(event.target.checked)} required />
              <span>این درخواست با اطلاع و رضایت ولی یا سرپرست قانونی دانش‌آموز ثبت می‌شود و شماره تماس ثبت‌شده او برای پیگیری همین درخواست استفاده خواهد شد. <b>*</b></span>
            </label>
            <label className="consent-check">
              <input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} required />
              <span><Link href="/privacy" target="_blank" rel="noreferrer">اطلاعیه حریم خصوصی</Link> را خوانده‌ام و با پردازش اطلاعات لازم برای بررسی این درخواست موافقم. <b>*</b></span>
            </label>
            <p className="consent-note">تأیید سرپرست در این فرم یک اظهار ثبت‌شده است و به‌تنهایی احراز هویت مستقل ولی یا سرپرست محسوب نمی‌شود.</p>
          </div>
        </div>
      )}

      {error ? <p className="form-error" role="alert" aria-live="assertive">{error}</p> : null}

      <div className="form-step-actions">
        {step === 1 ? (
          <button className="button button-primary" type="button" onClick={goToNextStep}>ادامه <span aria-hidden="true">←</span></button>
        ) : (
          <>
            <button className="button button-secondary" type="button" disabled={submitting} onClick={() => { setError(""); setStep(1); }}>بازگشت</button>
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "در حال ثبت..." : "ثبت درخواست"} <span aria-hidden="true">←</span>
            </button>
          </>
        )}
        <span className="form-footnote">پس از ثبت، درخواست در پنل دانش‌آموزی و با کد پیگیری اختصاصی قابل مشاهده خواهد بود.</span>
      </div>
    </form>
  );
}
