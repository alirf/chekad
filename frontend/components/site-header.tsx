import Link from "next/link";

const olympiadLinks = [
  { href: "/olympiads/physics", label: "المپیاد فیزیک" },
  { href: "/olympiads/computer", label: "المپیاد کامپیوتر" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="چکاد، صفحه اصلی">
          <span className="brand-mark" aria-hidden="true">چ</span>
          <span className="brand-copy">
            <strong>چکاد</strong>
            <small>CHEKAD</small>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="ناوبری اصلی">
          <Link href="/">صفحه اصلی</Link>
          <details className="nav-dropdown">
            <summary>المپیادها</summary>
            <div className="dropdown-panel">
              {olympiadLinks.map((item) => (
                <Link href={item.href} key={item.href}>{item.label}</Link>
              ))}
            </div>
          </details>
          <Link href="/mentorship">مشاوره و منتورینگ</Link>
          <Link href="/exams">آزمون‌ها</Link>
          <Link href="/blog">بلاگ</Link>
          <Link href="/about">درباره چکاد</Link>
        </nav>

        <Link className="button button-primary header-cta" href="/mentorship/apply">
          درخواست مشاوره <span aria-hidden="true">←</span>
        </Link>

        <details className="mobile-nav">
          <summary aria-label="باز کردن منوی سایت">
            <span className="menu-icon" aria-hidden="true"><i /><i /><i /></span>
          </summary>
          <nav className="mobile-nav-panel" aria-label="منوی موبایل">
            <Link href="/">صفحه اصلی</Link>
            {olympiadLinks.map((item) => (
              <Link href={item.href} key={item.href}>{item.label}</Link>
            ))}
            <Link href="/mentorship">مشاوره و منتورینگ</Link>
            <Link href="/tutoring">کلاس خصوصی</Link>
            <Link href="/exams">آزمون‌ها</Link>
            <Link href="/blog">بلاگ</Link>
            <Link href="/about">درباره چکاد</Link>
            <Link href="/contact">تماس با چکاد</Link>
            <Link className="button button-primary mobile-menu-cta" href="/mentorship/apply">درخواست مشاوره</Link>
          </nav>
        </details>
      </div>
      <div className="mobile-action-bar">
        <div>
          <Link href="/mentorship/apply" className="button button-primary">درخواست مشاوره <span aria-hidden="true">←</span></Link>
          <Link href="/exams" className="button button-secondary">آزمون‌ها</Link>
        </div>
      </div>
    </header>
  );
}
