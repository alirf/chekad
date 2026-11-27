import Link from "next/link";
import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "right",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "right" | "center";
}) {
  return (
    <div className={"section-heading section-heading-" + align}>
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function ActionLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "text";
  className?: string;
}) {
  return (
    <Link href={href} className={"button button-" + variant + (className ? " " + className : "")}>
      {children}
    </Link>
  );
}

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav className="breadcrumbs container" aria-label="مسیر صفحه">
      <ol>
        {items.map((item, index) => (
          <li key={item.label}>
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ServiceCard({
  number,
  title,
  description,
  details,
  href,
  linkLabel,
}: {
  number: string;
  title: string;
  description: string;
  details: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <article className="service-card">
      <div className="card-topline"><span>{number}</span><span className="card-arrow" aria-hidden="true">↗</span></div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="service-detail">{details}</div>
      <Link className="text-link" href={href}>{linkLabel} <span aria-hidden="true">←</span></Link>
    </article>
  );
}

export function OlympiadCard({
  field,
  title,
  subtitle,
  description,
  href,
}: {
  field: "physics" | "computer";
  title: string;
  subtitle: string;
  description: string;
  href: string;
}) {
  return (
    <article className={"olympiad-card olympiad-card-" + field}>
      <div className="olympiad-card-art" aria-hidden="true">
        {field === "physics" ? (
          <svg viewBox="0 0 220 160" role="presentation">
            <circle cx="110" cy="80" r="48" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".32" />
            <ellipse cx="110" cy="80" rx="88" ry="31" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(-27 110 80)" />
            <ellipse cx="110" cy="80" rx="88" ry="31" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(32 110 80)" />
            <circle cx="110" cy="80" r="7" fill="currentColor" />
            <circle cx="184" cy="47" r="5" fill="#20B6B5" />
            <path d="M25 127h170M41 113v28M179 113v28" stroke="currentColor" strokeWidth="1" opacity=".25" />
          </svg>
        ) : (
          <svg viewBox="0 0 220 160" role="presentation">
            <rect x="34" y="23" width="152" height="114" rx="12" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".4" />
            <path d="M60 55h34M60 76h20M60 97h45M124 55h35M124 76h24M124 97h35" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <path d="M111 23v114" stroke="currentColor" strokeWidth="1" opacity=".25" />
            <circle cx="162" cy="119" r="5" fill="#20B6B5" />
          </svg>
        )}
      </div>
      <span className="eyebrow">{subtitle}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <Link href={href} className="text-link">ورود به صفحه المپیاد <span aria-hidden="true">←</span></Link>
    </article>
  );
}

export function EmptyState({
  title,
  description,
  icon = "◇",
}: {
  title: string;
  description: string;
  icon?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export function CtaBanner({
  eyebrow = "شروع مسیر",
  title,
  description,
  href = "/mentorship/apply",
  buttonLabel = "درخواست مشاوره",
}: {
  eyebrow?: string;
  title: string;
  description: string;
  href?: string;
  buttonLabel?: string;
}) {
  return (
    <section className="cta-section">
      <div className="container">
        <div className="cta-banner">
          <div className="cta-decoration" aria-hidden="true">C.</div>
          <div className="cta-copy">
            <span className="eyebrow eyebrow-light">{eyebrow}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <ActionLink href={href} variant="light">{buttonLabel} <span aria-hidden="true">←</span></ActionLink>
        </div>
      </div>
    </section>
  );
}

export function FaqList({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="faq-list">
      {items.map((item, index) => (
        <details className="faq-item" key={item.question}>
          <summary><span className="faq-number">{String(index + 1).padStart(2, "0")}</span>{item.question}<span className="faq-plus" aria-hidden="true">+</span></summary>
          <div className="faq-answer"><p>{item.answer}</p></div>
        </details>
      ))}
    </div>
  );
}

export function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="feature-list">
      {items.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}
    </ul>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="page-intro">
      <div className="container page-intro-inner">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {children ? <div className="page-intro-actions">{children}</div> : null}
      </div>
    </section>
  );
}
