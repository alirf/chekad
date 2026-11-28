import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
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

          <Link className="header-auth-placeholder" href="/login">
            ورود / ثبت‌نام
          </Link>

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
              <Link className="mobile-auth-placeholder" href="/login">ورود / ثبت‌نام</Link>
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
