"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "./site-ui";

type EditorialItem = {
  id: number; slug: string; title: string; excerpt?: string; description?: string;
  category?: string; field?: string; stage?: string; starts_at?: string;
  duration_minutes?: number; registration_url?: string; cover_image_url?: string;
  status: string;
};

export function EditorialList({ kind }: { kind: "articles" | "exams" }) {
  const [items, setItems] = useState<EditorialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/content/" + kind, { headers: { Accept: "application/json" }, cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("request failed"); return response.json(); })
      .then((data: unknown) => { if (active && Array.isArray(data)) setItems(data as EditorialItem[]); })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind]);
  if (loading) return <p className="text-sm text-slate-500">در حال دریافت اطلاعات...</p>;
  if (failed) return <EmptyState title="دریافت اطلاعات ممکن نشد" description="سرویس محتوا در دسترس نیست. لطفاً بعداً دوباره تلاش کنید." />;
  if (!items.length) return <EmptyState title={kind === "articles" ? "هنوز مقاله‌ای منتشر نشده است" : "هنوز آزمونی منتشر نشده است"} description="به محض انتشار محتوای تأییدشده، اطلاعات آن در این بخش نمایش داده می‌شود." />;
  return <div className="editorial-grid">{items.map((item) => <article className="editorial-card" key={item.id}>
    {item.cover_image_url ? <img className="editorial-cover" src={item.cover_image_url} alt="" loading="lazy" /> : <div className="editorial-cover" aria-hidden="true" />}
    <div className="editorial-card-body">
      <span className="editorial-meta">{kind === "articles" ? item.category : (item.field === "physics" ? "المپیاد فیزیک" : "المپیاد کامپیوتر")}</span>
      <h2>{item.title}</h2><p>{item.excerpt || item.description || (item.stage ? item.stage + " · " + item.starts_at : "")}</p>
      {kind === "articles" ? <Link className="text-link" href={"/blog/" + item.slug}>ادامه مقاله ←</Link> :
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{item.stage} · {item.duration_minutes ? item.duration_minutes + " دقیقه" : "زمان اعلام می‌شود"}</span>{item.registration_url ? <a className="text-link" href={item.registration_url} target="_blank" rel="noreferrer">ثبت‌نام ←</a> : <span>{item.status === "upcoming" ? "به‌زودی" : item.status === "closed" ? "ثبت‌نام بسته" : "اطلاعات بیشتر"}</span>}</div>}
    </div>
  </article>)}</div>;
}
