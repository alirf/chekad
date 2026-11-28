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
  published_at?: string | null;
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

function formatArticleDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(date);
}

export function EditorialList({ kind }: { kind: "articles" | "exams" }) {
  const [items, setItems] = useState<EditorialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("همه مطالب");

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
      : <div className="blog-list-loading" role="status">در حال آماده‌کردن مجله چکاد...</div>;
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
          ? "با انتشار نخستین مطلب، مقاله‌ها و راهنماهای چکاد در این بخش نمایش داده می‌شوند."
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

  const categories = ["همه مطالب", ...Array.from(new Set(items.map((item) => item.category?.trim()).filter((value): value is string => Boolean(value)))];
  const visibleArticles = selectedCategory === "همه مطالب"
    ? items
    : items.filter((item) => (item.category?.trim() || "عمومی") === selectedCategory);
  const featuredArticle = visibleArticles[0];
  const remainingArticles = visibleArticles.slice(1);

  return (
    <div className="blog-editorial-list">
      <div className="blog-filter-bar" aria-label="فیلتر دسته‌بندی مقاله‌ها">
        <span className="blog-filter-label">دسته‌بندی</span>
        <div className="blog-filter-options">
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              className={"blog-filter-chip" + (selectedCategory === category ? " is-active" : "")}
              aria-pressed={selectedCategory === category}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
              {category === "همه مطالب" ? <span>{items.length.toLocaleString("fa-IR")}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {featuredArticle ? (
        <article className="blog-featured-card">
          {featuredArticle.cover_image_url
            ? <img className="blog-featured-image" src={featuredArticle.cover_image_url} alt="" loading="lazy" />
            : <div className="blog-featured-art" aria-hidden="true"><span>چ</span><small>CHEKAD · JOURNAL</small><i /><b>01</b></div>}
          <div className="blog-featured-content">
            <div className="blog-article-meta">
              <span className="blog-category-chip">{featuredArticle.category?.trim() || "یادداشت"}</span>
              {formatArticleDate(featuredArticle.published_at) ? <time>{formatArticleDate(featuredArticle.published_at)}</time> : null}
            </div>
            <span className="blog-featured-label">پیشنهاد مجله</span>
            <h2><Link href={"/blog/" + featuredArticle.slug}>{featuredArticle.title}</Link></h2>
            <p>{featuredArticle.excerpt || featuredArticle.description || "برای آشنایی با محتوای این مطلب، ادامه آن را بخوان."}</p>
            <Link className="blog-read-link" href={"/blog/" + featuredArticle.slug}>مطالعه مقاله <b>←</b></Link>
          </div>
        </article>
      ) : null}

      {remainingArticles.length ? (
        <div className="blog-article-grid">
          {remainingArticles.map((item) => (
            <article className="blog-article-card" key={item.id}>
              {item.cover_image_url
                ? <img className="blog-article-image" src={item.cover_image_url} alt="" loading="lazy" />
                : <div className="blog-article-art" aria-hidden="true"><span>چ</span><small>CHEKAD JOURNAL</small></div>}
              <div className="blog-article-body">
                <div className="blog-article-meta">
                  <span className="blog-category-chip">{item.category?.trim() || "یادداشت"}</span>
                  {formatArticleDate(item.published_at) ? <time>{formatArticleDate(item.published_at)}</time> : null}
                </div>
                <h3><Link href={"/blog/" + item.slug}>{item.title}</Link></h3>
                <p>{item.excerpt || item.description || "برای آشنایی با محتوای این مطلب، ادامه آن را بخوان."}</p>
                <Link className="blog-read-link" href={"/blog/" + item.slug}>ادامه مطالعه <b>←</b></Link>
              </div>
            </article>
          ))}
        </div>
      ) : visibleArticles.length === 1 ? (
        <div className="blog-single-article-note">در این دسته‌بندی فعلاً همین یک مطلب منتشر شده است.</div>
      ) : null}
      <p className="blog-result-count" aria-live="polite">{visibleArticles.length.toLocaleString("fa-IR")} مطلب در این فهرست</p>
    </div>
  );
}
