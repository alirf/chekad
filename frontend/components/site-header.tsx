"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useStudentSession } from "./student-session-provider";

export function SiteHeader() {
  const {
    status,
    student,
    refreshSession,
    logout,
  } = useStudentSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function handleRefreshSession() {
    setFeedback("");
    await refreshSession();
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setFeedback("");
    try {
      await logout();
    } catch {
      setFeedback("خروج از حساب انجام نشد. اتصال را بررسی و دوباره تلاش کن.");
    } finally {
      setLoggingOut(false);
    }
  }

  const studentName = student
    ? (student.first_name + " " + student.last_name).trim()
    : "دانش‌آموز چکاد";
  const avatarLetter = student
    ? student.first_name.trim().slice(0, 1) || "د"
    : "د";

  const desktopAccount = status === "checking" ? (
    <span className="header-auth-placeholder" aria-live="polite">در حال بررسی حساب...</span>
  ) : status === "authenticated" ? (
    <details className="header-account-menu">
      <summary className="header-account-trigger" aria-label="باز کردن منوی حساب دانش‌آموزی">
        <span className="header-account-avatar">{avatarLetter}</span>
        <span className="header-account-copy">
          <strong>{studentName}</strong>
          <small>حساب دانش‌آموزی</small>
        </span>
        <i aria-hidden="true" />
      </summary>
      <div className="header-account-dropdown">
        <div className="header-account-dropdown-heading">
          <strong>{studentName}</strong>
          <small>وارد حساب دانش‌آموزی شده‌ای</small>
        </div>
        <Link href="/dashboard">رفتن به پنل دانش‌آموزی <span aria-hidden="true">←</span></Link>
        <Link href="/dashboard/messages">پیام‌های من <span aria-hidden="true">←</span></Link>
        {feedback && <p role="alert">{feedback}</p>}
        <button type="button" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? "در حال خروج..." : "خروج از حساب"}
        </button>
      </div>
    </details>
  ) : status === "unavailable" ? (
    <button type="button" className="header-auth-placeholder header-auth-retry" onClick={handleRefreshSession}>
      بررسی دوباره حساب
    </button>
  ) : (
    <Link className="header-auth-placeholder" href="/login">ورود / ثبت‌نام</Link>
  );

  const mobileAccount = status === "checking" ? (
    <div className="mobile-account-status" role="status">در حال بررسی حساب دانش‌آموزی...</div>
  ) : status === "authenticated" ? (
    <div className="mobile-account-panel">
      <div className="mobile-account-identity">
        <span className="header-account-avatar">{avatarLetter}</span>
        <span><strong>{studentName}</strong><small>حساب دانش‌آموزی فعال</small></span>
      </div>
      <Link className="mobile-auth-placeholder" href="/dashboard">ورود به پنل دانش‌آموزی</Link>
      <Link className="mobile-account-secondary" href="/dashboard/messages">مشاهده پیام‌ها</Link>
      {feedback && <p className="mobile-account-error" role="alert">{feedback}</p>}
      <button type="button" className="mobile-account-logout" onClick={handleLogout} disabled={loggingOut}>
        {loggingOut ? "در حال خروج..." : "خروج از حساب"}
      </button>
    </div>
  ) : status === "unavailable" ? (
    <button type="button" className="mobile-auth-placeholder mobile-auth-retry" onClick={handleRefreshSession}>
      بررسی دوباره وضعیت حساب
    </button>
  ) : (
    <Link className="mobile-auth-placeholder" href="/login">ورود / ثبت‌نام دانش‌آموزی</Link>
  );

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="brand" aria-label="چکاد، صفحه اصلی">
            <Image
              src="/chekad-logo-white.svg"
              alt="لوگوی چکاد"
              width={112}
              height={112}
              className="brand-logo brand-logo-header"
              priority
            />
          </Link>

          <nav className="desktop-nav" aria-label="ناوبری اصلی">
            <Link href="/mentorship">مشاوران</Link>
            <Link href="/tutoring">مدرسان</Link>
            <Link href="/exams">آزمون</Link>
            <Link href="/blog">مقالات</Link>
            <Link href="/about">درباره ما</Link>
          </nav>

          {desktopAccount}

          <details className="mobile-nav">
            <summary aria-label="باز کردن منوی سایت">
              <span className="menu-icon" aria-hidden="true"><i /><i /><i /></span>
            </summary>
            <nav className="mobile-nav-panel" aria-label="منوی موبایل">
              <Link href="/mentorship">مشاوران</Link>
              <Link href="/tutoring">مدرسان</Link>
              <Link href="/exams">آزمون</Link>
              <Link href="/blog">مقالات</Link>
              <Link href="/about">درباره ما</Link>
              {mobileAccount}
            </nav>
          </details>
        </div>
      </header>

      <div className="mobile-action-bar">
        <div>
          <Link href="/mentorship/apply" className="button button-primary">درخواست مشاوره <span aria-hidden="true">←</span></Link>
          <Link href="/tutoring" className="button button-secondary">کلاس خصوصی</Link>
        </div>
      </div>
    </>
  );
}
