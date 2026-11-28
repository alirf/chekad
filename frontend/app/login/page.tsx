"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { fetchStudentProfile, loginStudent, StudentAuthError } from "../../lib/student-auth";

export default function StudentLoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await loginStudent(phone.trim(), password);
      const session = await fetchStudentProfile();
      if (session.id !== result.student.id) {
        throw new StudentAuthError("ورود انجام شد، اما نشست مرورگر تأیید نشد. نشانی سایت و تنظیم کوکی محلی را بررسی کنید.");
      }
      window.location.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof StudentAuthError ? cause.message : "ورود انجام نشد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main-content" className="student-auth-page">
      <section className="student-auth-shell">
        <div className="student-auth-aside">
          <span className="student-auth-kicker">CHEKAD STUDENT PORTAL</span>
          <h1>مسیر المپیادت را از همین‌جا ادامه بده.</h1>
          <p>با ورود به حساب دانش‌آموزی، به سرویس‌های چکاد، مشاوران، مدرسان و محتوای تخصصی دسترسی پیدا می‌کنی.</p>
          <div className="student-auth-aside-mark" aria-hidden="true">چ</div>
        </div>
        <div className="student-auth-card">
          <div className="student-auth-card-heading">
            <span className="student-auth-label">خوش برگشتی</span>
            <h2>ورود به حساب</h2>
            <p>شماره همراه و رمز عبورت را وارد کن.</p>
          </div>
          <form onSubmit={handleSubmit} className="student-auth-form">
            <label>
              <span>شماره همراه</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="username"
                dir="ltr"
                placeholder="0912 345 6789"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                minLength={10}
              />
            </label>
            <label>
              <span>رمز عبور</span>
              <input
                type="password"
                autoComplete="current-password"
                dir="ltr"
                placeholder="رمز عبور حساب"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {error && <p className="student-auth-error" role="alert">{error}</p>}
            <button type="submit" className="student-auth-submit" disabled={loading}>
              {loading ? "در حال ورود..." : "ورود به حساب"}
              <span aria-hidden="true">←</span>
            </button>
          </form>
          <p className="student-auth-switch">
            هنوز حساب نداری؟ <Link href="/register">ثبت‌نام دانش‌آموزی</Link>
          </p>
          <p className="student-auth-footnote">برای بازیابی رمز عبور، فعلاً با پشتیبانی چکاد و با اطلاع ولی یا سرپرست تماس بگیر.</p>
        </div>
      </section>
    </main>
  );
}
