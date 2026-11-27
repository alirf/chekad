"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MarkdownContent } from "../../../components/markdown-content";
import { EmptyState } from "../../../components/site-ui";

type Section = { type: "heading" | "text" | "image" | "features" | "cta"; title?: string; body?: string; image_url?: string; items?: string[]; button_label?: string; url?: string };
type CmsPageData = { title: string; description?: string; content?: string; sections?: Section[]; layout?: string; image_url?: string; seo_title?: string; seo_description?: string };
export default function CmsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [page, setPage] = useState<CmsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/content/pages/" + encodeURIComponent(slug), { cache: "no-store", headers: { Accept: "application/json" } })
      .then(async (response) => { if (!response.ok) throw new Error("not found"); return response.json(); })
      .then((data: CmsPageData) => { if (active) {
        setPage(data);
        document.title = (data.seo_title || data.title) + " | چکاد";
        if (data.seo_description) {
          let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
          if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); }
          meta.content = data.seo_description;
        }
      } })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  if (loading) return <main className="container py-20 text-center" dir="rtl">در حال بارگذاری صفحه...</main>;
  if (failed || !page) return <main className="container py-20" dir="rtl"><EmptyState title="صفحه پیدا نشد" description="این صفحه منتشر نشده یا نشانی آن معتبر نیست." /></main>;
  const layoutClass = page.layout === "narrow" ? "max-w-3xl" : page.layout === "wide" ? "max-w-7xl" : "max-w-5xl";
  return <main className="min-h-screen bg-white px-4 py-12" dir="rtl"><article className={layoutClass + " mx-auto"}>
    <header className="mb-10"><h1 className="text-3xl font-black leading-relaxed text-slate-900">{page.title}</h1>{page.description && <p className="mt-3 text-base leading-8 text-slate-600">{page.description}</p>}{page.image_url && <img src={page.image_url} alt="" className="mt-7 max-h-[440px] w-full rounded-2xl object-cover" />}</header>
    <div className={page.layout === "split" ? "grid gap-8 md:grid-cols-2" : "space-y-9"}>
      {(page.sections || []).map((section, index) => <section key={index} className="min-w-0">
        {section.type === "heading" && <><h2 className="mb-3 text-2xl font-extrabold text-slate-900">{section.title}</h2>{section.body && <p className="whitespace-pre-wrap text-sm leading-9 text-slate-600">{section.body}</p>}</>}
        {section.type === "text" && <><h2 className="mb-3 text-xl font-bold text-slate-900">{section.title}</h2><p className="whitespace-pre-wrap text-sm leading-9 text-slate-600">{section.body}</p></>}
        {section.type === "image" && section.image_url && <figure><img src={section.image_url} alt={section.title || ""} className="w-full rounded-2xl object-cover" />{section.title && <figcaption className="mt-2 text-center text-xs text-slate-500">{section.title}</figcaption>}</figure>}
        {section.type === "features" && <><h2 className="mb-3 text-xl font-bold text-slate-900">{section.title}</h2><ul className="grid gap-3 sm:grid-cols-2">{(section.items || []).map((item, itemIndex) => <li key={itemIndex} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">{item}</li>)}</ul></>}
        {section.type === "cta" && <div className="rounded-2xl bg-slate-900 p-7 text-white"><h2 className="text-xl font-extrabold">{section.title}</h2>{section.body && <p className="mt-2 text-sm leading-8 text-slate-300">{section.body}</p>}{section.url && <a href={section.url} rel="noreferrer" className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900">{section.button_label || "ادامه"}</a>}</div>}
      </section>)}
    </div>
    {!page.sections?.length && page.content && <MarkdownContent source={page.content} />}
  </article></main>;
}
