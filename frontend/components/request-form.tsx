"use client";

import { useState, type FormEvent } from "react";
import type { OlympiadField } from "../lib/api";

type RequestKind = "mentorship" | "tutoring";

const grades = ["دهم", "یازدهم", "دوازدهم", "فارغ‌التحصیل", "سایر"];
const fields: { value: OlympiadField; label: string }[] = [
  { value: "physics", label: "المپیاد فیزیک" },
  { value: "computer", label: "المپیاد کامپیوتر" },
];

export function RequestForm({ kind }: { kind: RequestKind }) {
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
    <form className="request-form" onSubmit={handleSubmit} noValidate>
      <div className="form-heading">
        <span className="eyebrow">{isMentorship ? "فرم درخواست منتورینگ" : "فرم درخواست کلاس خصوصی"}</span>
        <h2>{isMentorship ? "کمی از مسیرت برای ما بگو." : "برای چه مبحثی به مدرس نیاز داری؟"}</h2>
        <p>فیلدهای ستاره‌دار برای تکمیل فرم رابط کاربری ضروری‌اند. در این نسخه، اطلاعات به سرور ارسال یا ذخیره نمی‌شوند.</p>
      </div>

      <div className="form-grid">
        <div className="form-field">
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

        {isMentorship ? (
          <div className="form-field">
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
          <div className="form-field">
            <label htmlFor="tutoring-topic">مبحث یا موضوع موردنیاز <span>*</span></label>
            <input id="tutoring-topic" value={topic} onChange={(event) => setTopic(event.target.value)} onInvalid={(event) => (event.currentTarget.setCustomValidity("لطفاً موضوع موردنیاز را وارد کنید."))} onInput={(event) => event.currentTarget.setCustomValidity("")} required maxLength={160} placeholder="مثلاً مکانیک یا ساختمان داده" />
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

      {notice ? <p className="form-notice" role="status" aria-live="polite">{notice}</p> : null}

      <div className="form-actions">
        <button className="button button-primary" type="submit">بررسی اطلاعات <span aria-hidden="true">←</span></button>
        <span className="form-footnote">هیچ اطلاعاتی در این نسخه ارسال یا ذخیره نمی‌شود.</span>
      </div>
    </form>
  );
}
