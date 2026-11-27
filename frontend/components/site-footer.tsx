import Link from "next/link";

const footerGroups = [
  {
    title: "خدمات",
    links: [
      { href: "/mentorship", label: "مشاوره و منتورینگ" },
      { href: "/tutoring", label: "کلاس خصوصی" },
      { href: "/exams", label: "آزمون‌های آزمایشی" },
    ],
  },
  {
    title: "المپیادها",
    links: [
      { href: "/olympiads/physics", label: "المپیاد فیزیک" },
      { href: "/olympiads/computer", label: "المپیاد کامپیوتر" },
      { href: "/blog", label: "مجله تخصصی" },
    ],
  },
  {
    title: "چکاد",
    links: [
      { href: "/about", label: "درباره ما" },
      { href: "/contact", label: "ارتباط با چکاد" },
      { href: "/terms", label: "قوانین و مقررات" },
      { href: "/privacy", label: "حریم خصوصی" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-brand">
            <Link href="/" className="brand brand-light">
              <span className="brand-mark" aria-hidden="true">چ</span>
              <span className="brand-copy"><strong>چکاد</strong><small>CHEKAD</small></span>
            </Link>
            <p>
              همراهی تخصصی برای دانش‌آموزانی که مسیر المپیاد فیزیک و کامپیوتر را جدی و آگاهانه دنبال می‌کنند.
            </p>
          </div>
          {footerGroups.map((group) => (
            <div className="footer-group" key={group.title}>
              <h2>{group.title}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}><Link href={link.href}>{link.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© تمامی حقوق مادی و معنوی این وب‌سایت متعلق به چکاد است.</span>
          <span>ساخته‌شده برای مسیرهای جدی و مسئله‌های دشوار.</span>
        </div>
      </div>
    </footer>
  );
}
