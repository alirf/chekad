"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { fetchStudentProfile, registerStudent, StudentAuthError, StudentGrade, OlympiadField } from "../../lib/student-auth";
import { useStudentSession } from "../../components/student-session-provider";

export default function StudentRegisterPage() {
  const { setAuthenticated } = useStudentSession();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [grade, setGrade] = useState<StudentGrade>("دهم");
  const [field, setField] = useState<OlympiadField>("physics");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== passwordConfirm) {
      setError("تکرار رمز عبور با رمز اصلی یکسان نیست.");
      return;
    }
    if (password.length < 10) {
      setError("رمز عبور باید دست‌کم ۱۰ نویسه داشته باشد.");
      return;
    }
    if (!guardianConsent || !privacyAccepted) {
      setError("تأیید رضایت ولی یا سرپرست و اطلاعیه حریم خصوصی الزامی است.");
      return;
    }

    setLoading(true);
    try {
      const result = await registerStudent({
        first_name: firstName,
        last_name: lastName,
        phone: phone.trim(),
        guardian_phone: guardianPhone.trim(),
        grade,
        field,
        password,
        guardian_consent: true,
        privacy_accepted: true,
      });
      const session = await fetchStudentProfile();
      if (session.id !== result.student.id) {
        throw new StudentAuthError("حساب ساخته شد، اما نشست مرورگر تأیید نشد. نشانی سایت و تنظیم کوکی محلی را بررسی کنید.");
      }
      setAuthenticated(session);
      window.location.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof StudentAuthError ? cause.message : "ثبت‌نام انجام نشد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main-content" className="student-auth-page student-register-page">
      <section className="student-auth-shell student-register-shell">
        <div className="student-auth-aside">
          <span className="student-auth-kicker">START WITH CHEKAD</span>
          <h1>برای مسیر المپیادت، یک حساب بساز.</h1>
          <p>اطلاعات پایه را ثبت کن تا به سرویس‌های چکاد و مسیرهای تخصصی فیزیک و کامپیوتر دسترسی داشته باشی.</p>
          <div className="student-auth-aside-mark" aria-hidden="true">چ</div>
        </div>
        <div className="student-auth-card student-register-card">
          <div className="student-auth-card-heading">
            <span className="student-auth-label">حساب دانش‌آموزی</span>
            <h2>ثبت‌نام در چکاد</h2>
            <p>ثبت‌نام را با اطلاع و رضایت ولی یا سرپرست قانونی انجام بده.</p>
          </div>
          <form onSubmit={handleSubmit} className="student-auth-form">
            <div className="student-auth-form-grid">
              <label>
                <span>نام</span>
                <input autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required minLength={2} maxLength={80} />
              </label>
              <label>
                <span>نام خانوادگی</span>
                <input autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required minLength={2} maxLength={80} />
              </label>
              <label>
                <span>شماره همراه دانش‌آموز</span>
                <input type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="0912 345 6789" value={phone} onChange={(event) => setPhone(event.target.value)} required />
              </label>
              <label>
                <span>شماره همراه ولی یا سرپرست</span>
                <input type="tel" inputMode="tel" dir="ltr" placeholder="0912 345 6789" value={guardianPhone} onChange={(event) => setGuardianPhone(event.target.value)} required />
              </label>
              <label>
                <span>پایه تحصیلی</span>
                <select value={grade} onChange={(event) => setGrade(event.target.value as StudentGrade)}>
                  <option value="دهم">دهم</option>
                  <option value="یازدهم">یازدهم</option>
                  <option value="دوازدهم">دوازدهم</option>
                </select>
              </label>
              <label>
                <span>رشته المپیاد</span>
                <select value={field} onChange={(event) => setField(event.target.value as OlympiadField)}>
                  <option value="physics">المپیاد فیزیک</option>
                  <option value="computer">المپیاد کامپیوتر</option>
                </select>
              </label>
              <label>
                <span>رمز عبور</span>
                <input type="password" autoComplete="new-password" dir="ltr" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={10} maxLength={72} />
              </label>
              <label>
                <span>تکرار رمز عبور</span>
                <input type="password" autoComplete="new-password" dir="ltr" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} required minLength={10} maxLength={72} />
              </label>
            </div>
            <label className="student-auth-check">
              <input type="checkbox" checked={guardianConsent} onChange={(event) => setGuardianConsent(event.target.checked)} />
              <span>ولی یا سرپرست قانونی‌ام این ثبت‌نام و اطلاعیه حریم خصوصی را دیده و برای ایجاد حساب دانش‌آموزی رضایت داده است.</span>
            </label>
            <label className="student-auth-check">
              <input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} />
              <span>اطلاعیه <Link href="/privacy" target="_blank">حریم خصوصی</Link> را خوانده‌ام و با ثبت اطلاعات ضروری برای ایجاد حساب موافقم.</span>
            </label>
            <p className="student-auth-notice">ولی یا سرپرست قانونی باید پیش از ثبت‌نام، فرم و اطلاعیه حریم خصوصی را بررسی و تأیید کند. در این نسخه، ورود با رمز عبور انجام می‌شود؛ تأیید پیامکی شماره همراه و بازیابی خودکار رمز هنوز پیاده‌سازی نشده‌اند. ثبت checkbox به‌تنهایی احراز مستقل سرپرست نیست.</p>
            {error && <p className="student-auth-error" role="alert">{error}</p>}
            <button type="submit" className="student-auth-submit" disabled={loading || !guardianConsent || !privacyAccepted}>
              {loading ? "در حال ساخت حساب..." : "ساخت حساب دانش‌آموزی"}
              <span aria-hidden="true">←</span>
            </button>
          </form>
          <p className="student-auth-switch">
            قبلاً حساب ساخته‌ای؟ <Link href="/login">وارد شو</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
