import Image from "next/image";
import Link from "next/link";

const serviceLinks = [
  { href: "/mentorship", label: "منتورینگ و مشاوره" },
  { href: "/tutoring", label: "کلاس خصوصی" },
  { href: "/exams", label: "آزمون‌ها" },
];

const olympiadLinks = [
  { href: "/olympiads/physics", label: "المپیاد فیزیک" },
  { href: "/olympiads/computer", label: "المپیاد کامپیوتر" },
];

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
            <Link href="/" className="header-home-link" aria-current="page">خانه</Link>
            <details className="nav-dropdown">
              <summary>خدمات</summary>
              <div className="dropdown-panel">
                {serviceLinks.map((item) => (
                  <Link href={item.href} key={item.href}>{item.label}</Link>
                ))}
              </div>
            </details>
            <Link href="/mentorship">منتورها و مدرسان</Link>
            <Link href="/blog">مقالات</Link>
            <Link href="/about">درباره ما</Link>
            <Link href="/contact">تماس با ما</Link>
          </nav>

          <Link className="button button-primary header-cta" href="/mentorship/apply">
            درخواست مشاوره <span aria-hidden="true">↗</span>
          </Link>

          <details className="mobile-nav">
            <summary aria-label="باز کردن منوی سایت">
              <span className="menu-icon" aria-hidden="true"><i /><i /><i /></span>
            </summary>
            <nav className="mobile-nav-panel" aria-label="منوی موبایل">
              <Link href="/" aria-current="page">خانه</Link>
              <Link href="/mentorship">منتورها و مدرسان</Link>
              {serviceLinks.map((item) => (
                <Link href={item.href} key={item.href}>{item.label}</Link>
              ))}
              {olympiadLinks.map((item) => (
                <Link href={item.href} key={item.href}>{item.label}</Link>
              ))}
              <Link href="/blog">مقالات</Link>
              <Link href="/about">درباره ما</Link>
              <Link href="/contact">تماس با ما</Link>
              <Link className="button button-primary mobile-menu-cta" href="/mentorship/apply">درخواست مشاوره</Link>
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
