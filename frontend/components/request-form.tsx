"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ApiError, submitPublicApplication, type OlympiadField } from "../lib/api";

type RequestKind = "mentorship" | "tutoring";

const grades = ["دهم", "یازدهم", "دوازدهم", "فارغ‌التحصیل", "سایر"];
const fields: { value: OlympiadField; label: string }[] = [
  { value: "physics", label: "المپیاد فیزیک" },
  { value: "computer", label: "المپیاد کامپیوتر" },
];

export function RequestForm({
  kind,
  enabled,
}: {
  kind: RequestKind;
  enabled: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("");
  const [field, setField] = useState<OlympiadField | "">("");
  const [guardianPhone, setGuardianPhone] = useState("");
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
    if (!form.reportValidity() || submitting) return;

    if (!guardianConsent || !privacyAccepted || !field) {
      setError("تأیید سرپرست و پذیرش اطلاعیه حریم خصوصی الزامی است.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitPublicApplication(kind, {
        first_name: firstName,
        last_name: lastName,
        grade,
        field,
        guardian_phone: guardianPhone,
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
        <p className="form-footnote">این کد را برای پیگیری نزد خود نگه دار. اطلاعات تماس سرپرست فقط برای بررسی و پیگیری همین درخواست استفاده می‌شود.</p>
        <Link className="button button-secondary" href="/privacy">مرور اطلاعیه حریم خصوصی</Link>
      </section>
    );
  }

  return (
    <form ref={formRef} className="request-form" onSubmit={handleSubmit} noValidate>
      <div className="form-heading">
        <span className="eyebrow">{isMentorship ? "فرم درخواست منتورینگ" : "فرم درخواست کلاس خصوصی"}</span>
        <h2>{step === 1 ? "ابتدا مشخصات مسیر را وارد کن." : "نیاز و هدف را دقیق‌تر توضیح بده."}</h2>
        <p>در نسخه فعلی، فرم توسط ولی یا سرپرست تکمیل می‌شود تا راه تماس مشخصی برای پیگیری درخواست وجود داشته باشد.</p>
      </div>

      <div className="form-progress" aria-label={step === 1 ? "مرحله اول از دو مرحله" : "مرحله دوم از دو مرحله"}>
        <div className={step === 1 ? "form-progress-item is-active" : "form-progress-item is-complete"}><span>۱</span>مشخصات مسیر</div>
        <i className={step === 2 ? "is-complete" : ""} />
        <div className={step === 2 ? "form-progress-item is-active" : "form-progress-item"}><span>۲</span>نیاز و تأیید</div>
      </div>

      {step === 1 ? (
        <div className="form-grid form-step-panel">
          <div className="form-field">
            <label htmlFor="student-first-name">نام دانش‌آموز <span>*</span></label>
            <input id="student-first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required minLength={2} maxLength={100} autoComplete="given-name" placeholder="نام" />
          </div>

          <div className="form-field">
            <label htmlFor="student-last-name">نام خانوادگی <span>*</span></label>
            <input id="student-last-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required minLength={2} maxLength={100} autoComplete="family-name" placeholder="نام خانوادگی" />
          </div>

          <div className="form-field">
            <label htmlFor="student-grade">پایه تحصیلی <span>*</span></label>
            <select id="student-grade" value={grade} onChange={(event) => setGrade(event.target.value)} required>
              <option value="">انتخاب پایه</option>
              {grades.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="olympiad-field">رشته المپیاد <span>*</span></label>
            <select id="olympiad-field" value={field} onChange={(event) => setField(event.target.value as OlympiadField | "")} required>
              <option value="">انتخاب رشته</option>
              {fields.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
            </select>
          </div>

          <div className="form-field form-field-full">
            <label htmlFor="guardian-phone">شماره موبایل ولی یا سرپرست <span>*</span></label>
            <input id="guardian-phone" value={guardianPhone} onChange={(event) => setGuardianPhone(event.target.value)} required type="tel" inputMode="tel" autoComplete="tel" dir="ltr" maxLength={20} placeholder="۰۹۱۲۳۴۵۶۷۸۹" />
            <small>شماره شخصی دانش‌آموز دریافت نمی‌شود. این شماره فقط برای پیگیری درخواست استفاده خواهد شد.</small>
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
              <span>به‌عنوان ولی یا سرپرست، با ثبت درخواست این دانش‌آموز و استفاده از شماره تماس خود برای پیگیری آن موافقم. <b>*</b></span>
            </label>
            <label className="consent-check">
              <input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} required />
              <span><Link href="/privacy" target="_blank" rel="noreferrer">اطلاعیه حریم خصوصی</Link> را خوانده‌ام و با پردازش اطلاعات لازم برای بررسی این درخواست موافقم. <b>*</b></span>
            </label>
            <p className="consent-note">این تأیید به‌صورت اظهار کاربر ثبت می‌شود و به‌تنهایی احراز هویت مستقل ولی یا سرپرست نیست. در این نسخه، فرم باید توسط خود ولی یا سرپرست تکمیل شود.</p>
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
        <span className="form-footnote">اطلاعات تماس سرپرست برای پیگیری درخواست ضروری است؛ اطلاعات حساس دیگری دریافت نمی‌شود.</span>
      </div>
    </form>
  );
}
