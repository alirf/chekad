"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "./site-ui";

type EditorialItem = {
  id: number;
  slug: string;
  title: string;
  excerpt?: string;
  description?: string;
  category?: string;
  field?: string;
  stage?: string;
  starts_at?: string;
  duration_minutes?: number;
  registration_url?: string;
  cover_image_url?: string;
  status: string;
};

const examStatusLabels: Record<string, string> = {
  published: "منتشرشده",
  upcoming: "پیش‌رو",
  closed: "ثبت‌نام بسته",
  completed: "برگزارشده",
};

function formatExamDate(value?: string) {
  if (!value) return "اعلام نشده";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function EditorialList({ kind }: { kind: "articles" | "exams" }) {
  const [items, setItems] = useState<EditorialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/content/" + kind, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("request failed");
        return response.json();
      })
      .then((data: unknown) => {
        if (active && Array.isArray(data)) setItems(data as EditorialItem[]);
        else if (active) throw new Error("invalid response");
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kind]);

  if (loading) {
    return kind === "exams"
      ? <div className="exam-list-loading" role="status">در حال دریافت فهرست آزمون‌ها...</div>
      : <p className="text-sm text-slate-500">در حال دریافت اطلاعات...</p>;
  }

  if (failed) {
    return (
      <EmptyState
        title="دریافت اطلاعات ممکن نشد"
        description="سرویس محتوا در دسترس نیست. لطفاً بعداً دوباره تلاش کنید."
      />
    );
  }

  if (!items.length) {
    return (
      <EmptyState
        title={kind === "articles" ? "هنوز مقاله‌ای منتشر نشده است" : "در حال حاضر آزمون منتشرشده‌ای وجود ندارد"}
        description={kind === "articles"
          ? "به محض انتشار مقاله، آن را در این بخش می‌بینی."
          : "با انتشار آزمون فیزیک یا کامپیوتر، عنوان و وضعیت آن در این بخش نمایش داده می‌شود."}
      />
    );
  }

  if (kind === "exams") {
    return (
      <div className="editorial-grid exam-editorial-grid">
        {items.map((item) => {
          const fieldLabel = item.field === "physics" ? "المپیاد فیزیک" : "المپیاد کامپیوتر";
          const statusLabel = examStatusLabels[item.status] || "اطلاعات آزمون";
          const canCheckInPortal = item.status === "upcoming" || item.status === "published";
          const canOpenRegistrationNotice = canCheckInPortal && Boolean(item.registration_url);

          return (
            <article className="editorial-card exam-editorial-card" key={item.id}>
              {item.cover_image_url
                ? <img className="editorial-cover" src={item.cover_image_url} alt="" loading="lazy" />
                : <div className="editorial-cover exam-editorial-cover" aria-hidden="true"><span>{item.field === "physics" ? "∑" : "{ }"}</span><small>CHEKAD · OLYMPIAD</small></div>}
              <div className="editorial-card-body exam-editorial-body">
                <div className="exam-card-topline">
                  <span className="editorial-meta">{fieldLabel}</span>
                  <span className={"exam-status-chip exam-status-" + item.status}>{statusLabel}</span>
                </div>
                <h2>{item.title}</h2>
                <p>{item.description || "اطلاعات تکمیلی این آزمون در اطلاعیه رسمی اعلام می‌شود."}</p>
                <div className="exam-card-meta">
                  <span><b>مرحله</b>{item.stage || "اعلام نشده"}</span>
                  <span><b>زمان</b>{formatExamDate(item.starts_at)}</span>
                  <span><b>مدت</b>{item.duration_minutes ? item.duration_minutes.toLocaleString("fa-IR") + " دقیقه" : "اعلام نشده"}</span>
                </div>
                <div className="exam-card-actions">
                  {canCheckInPortal
                    ? <Link className="exam-card-primary" href="/dashboard/exams">بررسی در پنل دانش‌آموزی <span>←</span></Link>
                    : <span className="exam-card-status-note">{item.status === "completed" ? "این آزمون برگزار شده است." : "ثبت‌نام این آزمون بسته شده است."}</span>}
                  {canOpenRegistrationNotice && item.registration_url
                    ? <a className="exam-card-secondary" href={item.registration_url} target="_blank" rel="noreferrer">اطلاعیه آزمون <span>↗</span></a>
                    : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className="editorial-grid">
      {items.map((item) => (
        <article className="editorial-card" key={item.id}>
          {item.cover_image_url ? <img className="editorial-cover" src={item.cover_image_url} alt="" loading="lazy" /> : <div className="editorial-cover" aria-hidden="true" />}
          <div className="editorial-card-body">
            <span className="editorial-meta">{item.category}</span>
            <h2>{item.title}</h2>
            <p>{item.excerpt || item.description || (item.stage ? item.stage + " · " + item.starts_at : "")}</p>
            <Link className="text-link" href={"/blog/" + item.slug}>ادامه مقاله ←</Link>
          </div>
        </article>
      ))}
    </div>
  );
}
