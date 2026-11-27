"use client";

import { useRef, useState, type FormEvent } from "react";
import type { OlympiadField } from "../lib/api";

type RequestKind = "mentorship" | "tutoring";

const grades = ["دهم", "یازدهم", "دوازدهم", "فارغ‌التحصیل", "سایر"];
const fields: { value: OlympiadField; label: string }[] = [
  { value: "physics", label: "المپیاد فیزیک" },
  { value: "computer", label: "المپیاد کامپیوتر" },
];

export function RequestForm({ kind }: { kind: RequestKind }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [field, setField] = useState<OlympiadField | "">("");
  const [level, setLevel] = useState("");
  const [goal, setGoal] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [telegram, setTelegram] = useState("");
  const [notice, setNotice] = useState("");

  const isMentorship = kind === "mentorship";

  function goToNextStep() {
    if (formRef.current?.reportValidity()) {
      setNotice("");
      setStep(2);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    // No public application POST endpoint exists yet. Do not send or persist
    // student data until the backend contract and privacy flow are approved.
    setNotice(
      "اطلاعات شما ارسال نشد. فرم از نظر رابط کاربری آماده است، اما سرویس ثبت درخواست هنوز به وب‌سایت متصل نشده است. لطفاً فعلاً اطلاعات شخصی خود را در این فرم وارد نکنید.",
    );
  }

  return (
    <form ref={formRef} className="request-form" onSubmit={handleSubmit} noValidate>
      <div className="form-heading">
        <span className="eyebrow">{isMentorship ? "فرم درخواست منتورینگ" : "فرم درخواست کلاس خصوصی"}</span>
        <h2>{step === 1 ? "ابتدا کمی با شرایطت آشنا شو." : "نیازت را دقیق‌تر توضیح بده."}</h2>
        <p>فرم دو مرحله دارد. در این نسخه، اطلاعات واردشده به سرور ارسال یا ذخیره نمی‌شوند.</p>
      </div>

      <div className="form-progress" aria-label={step === 1 ? "مرحله اول از دو مرحله" : "مرحله دوم از دو مرحله"}>
        <div className={step === 1 ? "form-progress-item is-active" : "form-progress-item is-complete"}><span>۱</span>مشخصات مسیر</div>
        <i className={step === 2 ? "is-complete" : ""} />
        <div className={step === 2 ? "form-progress-item is-active" : "form-progress-item"}><span>۲</span>نیاز و هدف</div>
      </div>

      {step === 1 ? (
        <div className="form-grid form-step-panel">
          <div className="form-field form-field-full">
            <label htmlFor="student-name">نام و نام خانوادگی <span>*</span></label>
            <input id="student-name" value={name} onChange={(event) => setName(event.target.value)} required minLength={3} maxLength={120} autoComplete="name" placeholder="نام دانش‌آموز" />
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
        </div>
      ) : (
        <div className="form-grid form-step-panel">
          {isMentorship ? (
            <div className="form-field form-field-full">
              <label htmlFor="student-level">سطح فعلی</label>
              <select id="student-level" value={level} onChange={(event) => setLevel(event.target.value)}>
                <option value="">انتخاب سطح (اختیاری)</option>
                <option value="آشنایی اولیه">آشنایی اولیه</option>
                <option value="در حال مطالعه">در حال مطالعه</option>
                <option value="آمادگی آزمون">آمادگی آزمون</option>
                <option value="مرحله پیشرفته">مرحله پیشرفته</option>
              </select>
            </div>
          ) : (
            <div className="form-field form-field-full">
              <label htmlFor="tutoring-topic">مبحث یا موضوع موردنیاز <span>*</span></label>
              <input id="tutoring-topic" value={topic} onChange={(event) => setTopic(event.target.value)} required maxLength={160} placeholder="مثلاً مکانیک یا ساختمان داده" />
            </div>
          )}

          <div className="form-field form-field-full">
            <label htmlFor="request-goal">{isMentorship ? "هدفت از دریافت منتورینگ چیست؟" : "نوع نیاز آموزشی"}</label>
            <input id="request-goal" value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={180} placeholder={isMentorship ? "مثلاً طراحی برنامه، پیگیری و شناخت مسیر" : "مثلاً آموزش مبحث، حل تمرین یا رفع اشکال"} />
          </div>

          <div className="form-field form-field-full">
            <label htmlFor="request-notes">توضیحات تکمیلی</label>
            <textarea id="request-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} maxLength={1200} placeholder="هر نکته‌ای که فکر می‌کنی به شناخت بهتر نیازت کمک می‌کند..." />
          </div>

          <div className="form-field form-field-full">
            <label htmlFor="telegram-id">شناسه تلگرام یا روش ارتباطی ترجیحی</label>
            <input id="telegram-id" value={telegram} onChange={(event) => setTelegram(event.target.value)} maxLength={100} dir="ltr" placeholder="@username (اختیاری)" />
            <small>اطلاعات تماس را تا زمان فعال‌شدن ثبت امن درخواست، وارد نکنید.</small>
          </div>
        </div>
      )}

      {notice ? <p className="form-notice" role="status" aria-live="polite">{notice}</p> : null}

      <div className="form-step-actions">
        {step === 1 ? (
          <button className="button button-primary" type="button" onClick={goToNextStep}>ادامه <span aria-hidden="true">←</span></button>
        ) : (
          <>
            <button className="button button-secondary" type="button" onClick={() => { setNotice(""); setStep(1); }}>بازگشت</button>
            <button className="button button-primary" type="submit">بررسی اطلاعات <span aria-hidden="true">←</span></button>
          </>
        )}
        <span className="form-footnote">هیچ اطلاعاتی در این نسخه ارسال یا ذخیره نمی‌شود.</span>
      </div>
    </form>
  );
}
