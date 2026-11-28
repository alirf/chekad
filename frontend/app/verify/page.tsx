"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  resendStudentVerification,
  StudentAuthError,
  verifyStudentCode,
  type StudentVerificationPurpose,
} from "../../lib/student-auth";
import { useStudentSession } from "../../components/student-session-provider";

function maskPhone(value: string) {
  return value.length >= 7 ? value.slice(0, 4) + "*****" + value.slice(-2) : value;
}

function normalizeCode(value: string) {
  const localized = "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩";
  const ascii = "01234567890123456789";
  return Array.from(value, (character) => {
    const index = localized.indexOf(character);
    return index >= 0 ? ascii[index] : character;
  }).join("").replace(/\D/g, "").slice(0, 6);
}

export default function StudentVerificationPage() {
  const router = useRouter();
  const { status, student, setAuthenticated, refreshSession } = useStudentSession();
  const [phoneCode, setPhoneCode] = useState("");
  const [guardianCode, setGuardianCode] = useState("");
  const [busyPurpose, setBusyPurpose] = useState<StudentVerificationPurpose | null>(null);
  const [resendingPurpose, setResendingPurpose] = useState<StudentVerificationPurpose | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (status === "guest") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (
      status === "authenticated" &&
      student?.phone_verified &&
      student.guardian_consent
    ) {
      router.replace("/dashboard");
    }
  }, [status, student, router]);

  async function confirmCode(purpose: StudentVerificationPurpose, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = purpose === "student_phone" ? phoneCode.trim() : guardianCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("کد تأیید باید شش رقم باشد.");
      return;
    }

    setBusyPurpose(purpose);
    setError("");
    setNotice("");
    try {
      const result = await verifyStudentCode(purpose, code);
      setAuthenticated(result.student);
      if (purpose === "student_phone") setPhoneCode("");
      else setGuardianCode("");
      setNotice(
        result.fully_verified
          ? "تأیید شماره و رضایت سرپرست کامل شد. در حال انتقال به پنل..."
          : purpose === "student_phone"
            ? "شماره دانش‌آموز تأیید شد. مرحله تأیید سرپرست را تکمیل کن."
            : "رضایت سرپرست تأیید شد. یک مرحله دیگر باقی مانده است.",
      );
      if (result.fully_verified) {
        router.replace("/dashboard");
        router.refresh();
      }
    } catch (cause) {
      setError(cause instanceof StudentAuthError ? cause.message : "تأیید کد انجام نشد.");
    } finally {
      setBusyPurpose(null);
    }
  }

  async function resendCode(purpose: StudentVerificationPurpose) {
    setResendingPurpose(purpose);
    setError("");
    setNotice("");
    try {
      await resendStudentVerification(purpose);
      setNotice(
        purpose === "student_phone"
          ? "کد تازه به شماره دانش‌آموز ارسال شد."
          : "کد تازه به شماره سرپرست ارسال شد.",
      );
    } catch (cause) {
      setError(cause instanceof StudentAuthError ? cause.message : "ارسال مجدد کد انجام نشد.");
    } finally {
      setResendingPurpose(null);
    }
  }

  if (status === "checking" || status === "unavailable" || !student) {
    return (
      <main className="student-auth-page" dir="rtl">
        <section className="student-auth-card mx-auto max-w-xl">
          <h1 className="text-xl font-black">در حال بررسی حساب...</h1>
          <p className="mt-3 text-sm text-slate-600">برای ادامه، وضعیت نشست دانش‌آموزی بررسی می‌شود.</p>
          {status === "unavailable" && (
            <button type="button" className="student-auth-submit mt-5" onClick={() => void refreshSession()}>
              بررسی دوباره
            </button>
          )}
        </section>
      </main>
    );
  }

  const phoneVerified = student.phone_verified;
  const guardianVerified = student.guardian_consent;
  const guardianPhoneIsSeparate = student.phone !== student.guardian_phone;

  return (
    <main id="main-content" className="student-auth-page" dir="rtl">
      <section className="student-auth-shell mx-auto">
        <div className="student-auth-aside">
          <span className="student-auth-kicker">ACCOUNT VERIFICATION</span>
          <h1>یک گام کوتاه تا فعال شدن حساب.</h1>
          <p>برای حفاظت از حساب دانش‌آموز و اطمینان از رضایت سرپرست، هر دو شماره باید جداگانه تأیید شوند.</p>
          <div className="student-auth-aside-mark" aria-hidden="true">چ</div>
        </div>

        <div className="student-auth-card">
          <div className="student-auth-card-heading">
            <span className="student-auth-label">تکمیل ثبت‌نام</span>
            <h2>تأیید شماره‌ها</h2>
            <p>کدهای ارسال‌شده را در بخش مربوط به هر شماره وارد کن. کدها پس از پنج دقیقه منقضی می‌شوند.</p>
          </div>

          {error && <p className="student-auth-error" role="alert">{error}</p>}
          {notice && <p className="student-auth-notice" role="status">{notice}</p>}

          <section className="mt-5 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-blue-700">مرحله اول</span>
                <h3 className="mt-1 font-black text-slate-900">شماره همراه دانش‌آموز</h3>
                <p className="mt-1 text-xs text-slate-500" dir="ltr">{maskPhone(student.phone)}</p>
              </div>
              <span className={phoneVerified ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700" : "rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"}>
                {phoneVerified ? "تأیید شده" : "در انتظار تأیید"}
              </span>
            </div>
            {!phoneVerified && (
              <>
                <form onSubmit={(event) => void confirmCode("student_phone", event)} className="mt-4 space-y-3">
                  <label className="block text-sm font-bold text-slate-700" htmlFor="student-verification-code">
                    کد پیامک‌شده
                  </label>
                  <input
                    id="student-verification-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    dir="ltr"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={phoneCode}
                    onChange={(event) => setPhoneCode(normalizeCode(event.target.value))}
                    className="min-h-12 w-full rounded-xl border border-slate-200 px-4 text-center text-lg tracking-[0.35em]"
                    placeholder="••••••"
                    required
                  />
                  <button type="submit" className="student-auth-submit" disabled={busyPurpose !== null || phoneCode.length !== 6}>
                    {busyPurpose === "student_phone" ? "در حال تأیید..." : "تأیید شماره دانش‌آموز"}
                  </button>
                </form>
                <button type="button" onClick={() => void resendCode("student_phone")} disabled={resendingPurpose !== null || busyPurpose !== null} className="mt-3 text-xs font-bold text-blue-700 disabled:opacity-50">
                  {resendingPurpose === "student_phone" ? "در حال ارسال..." : "دریافت / ارسال دوباره کد"}
                </button>
              </>
            )}
          </section>

          <section className="mt-4 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-blue-700">مرحله دوم</span>
                <h3 className="mt-1 font-black text-slate-900">شماره همراه ولی یا سرپرست</h3>
                <p className="mt-1 text-xs text-slate-500" dir="ltr">{maskPhone(student.guardian_phone)}</p>
              </div>
              <span className={guardianVerified ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700" : "rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"}>
                {guardianVerified ? "رضایت تأیید شده" : "در انتظار رضایت"}
              </span>
            </div>
            {!guardianVerified && !guardianPhoneIsSeparate && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-800">
                شماره سرپرست و دانش‌آموز در این حساب یکسان است. برای تأیید مستقل، ابتدا شماره سرپرست را از طریق پشتیبانی چکاد اصلاح کن.
                <Link href="/contact" className="mr-1 font-black underline">ارتباط با پشتیبانی</Link>
              </div>
            )}
            {!guardianVerified && guardianPhoneIsSeparate && (
              <>
                <p className="mt-3 text-xs leading-6 text-slate-600">
                  کد برای سرپرست ارسال می‌شود. سرپرست باید کد را در اختیار دانش‌آموز قرار دهد و با وارد کردن آن، رضایت خود را برای ایجاد و استفاده از حساب اعلام کند.
                </p>
                <form onSubmit={(event) => void confirmCode("guardian_consent", event)} className="mt-4 space-y-3">
                  <label className="block text-sm font-bold text-slate-700" htmlFor="guardian-verification-code">
                    کد ارسال‌شده به سرپرست
                  </label>
                  <input
                    id="guardian-verification-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    dir="ltr"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={guardianCode}
                    onChange={(event) => setGuardianCode(normalizeCode(event.target.value))}
                    className="min-h-12 w-full rounded-xl border border-slate-200 px-4 text-center text-lg tracking-[0.35em]"
                    placeholder="••••••"
                    required
                  />
                  <button type="submit" className="student-auth-submit" disabled={busyPurpose !== null || guardianCode.length !== 6}>
                    {busyPurpose === "guardian_consent" ? "در حال تأیید..." : "تأیید رضایت سرپرست"}
                  </button>
                </form>
                <button type="button" onClick={() => void resendCode("guardian_consent")} disabled={resendingPurpose !== null || busyPurpose !== null} className="mt-3 text-xs font-bold text-blue-700 disabled:opacity-50">
                  {resendingPurpose === "guardian_consent" ? "در حال ارسال..." : "دریافت / ارسال دوباره کد به سرپرست"}
                </button>
              </>
            )}
          </section>

          <p className="mt-5 text-xs leading-6 text-slate-500">
            کد را با دیگران به اشتراک نگذار. اگر شماره سرپرست اشتباه است، پیش از ادامه از پشتیبانی چکاد درخواست اصلاح اطلاعات کن.
          </p>
          <p className="student-auth-switch mt-5">
            <Link href="/contact">نیاز به راهنمایی داری؟ با چکاد تماس بگیر.</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
