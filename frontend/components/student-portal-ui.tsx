import type { ReactNode } from "react";

export function PortalPageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="student-portal-page-heading">
      <div>
        {eyebrow && <span className="student-portal-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="student-portal-heading-action">{action}</div>}
    </div>
  );
}

export function PortalEmptyState({
  icon = "◇",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="student-portal-empty">
      <span className="student-portal-empty-icon" aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action && <div className="student-portal-empty-action">{action}</div>}
    </div>
  );
}

export function PortalStatus({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "در انتظار انجام",
    completed: "انجام‌شده",
    skipped: "انجام‌نشده",
    scheduled: "برنامه‌ریزی‌شده",
    active: "فعال",
    cancelled: "لغوشده",
    completed_session: "برگزارشده",
    issued: "صادرشده",
    overdue: "سررسیدگذشته",
    paid: "پرداخت‌شده",
    void: "باطل‌شده",
    published: "منتشرشده",
    upcoming: "پیش رو",
    closed: "بسته",

  };
  return <span className={"student-portal-status status-" + status}>{labels[status] || status}</span>;
}

export function formatPortalDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(date);
}

export function formatPortalDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
