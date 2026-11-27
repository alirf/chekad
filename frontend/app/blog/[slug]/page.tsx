"use client";

import { useEffect, useState } from "react";
import { Breadcrumbs, EmptyState } from "../../../components/site-ui";

type Article = { title: string; excerpt: string; body: string; category: string; cover_image_url?: string | null; published_at?: string | null };

export default function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState("");
  const [article, setArticle] = useState<Article | null>(null);
  const [failed, setFailed] = useState(false);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; params.then((p) => { if (active) setSlug(p.slug); }); return () => { active = false; }; }, [params]);
  useEffect(() => {
    if (!slug) return;
    let active = true;
    fetch("/api/content/articles/" + encodeURIComponent(slug), { cache: "no-store" })
      .then(async (r) => { if (r.status === 404) throw new Error("not-found"); if (!r.ok) throw new Error("failed"); return r.json(); })
      .then((data: Article) => { if (active) setArticle(data); })
      .catch((e: Error) => { if (active) { setMissing(e.message === "not-found"); setFailed(e.message !== "not-found"); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);
  return <main id="main-content"><Breadcrumbs items={[{ href: "/", label: "خانه" }, { href: "/blog", label: "مجله" }, { label: article?.title || "مقاله" }]} />
    <article className="content-section"><div className="container article-body">
      {loading ? <p>در حال دریافت مقاله...</p> : missing ? <EmptyState title="مقاله پیدا نشد" description="این مقاله منتشر نشده یا نشانی آن معتبر نیست." /> : failed ? <EmptyState title="دریافت مقاله ممکن نشد" description="لطفاً اتصال را بررسی کنید و دوباره تلاش کنید." /> : article ? <>
        <div className="article-meta"><span>{article.category}</span><span>{article.published_at ? new Date(article.published_at).toLocaleDateString("fa-IR") : ""}</span></div>
        <h1>{article.title}</h1>{article.excerpt ? <p className="text-lg text-slate-600">{article.excerpt}</p> : null}
        {article.cover_image_url ? <img src={article.cover_image_url} alt="" className="my-8 w-full rounded-2xl object-cover" /> : null}
        <div className="editorial-content">{article.body}</div>
      </> : null}
    </div></article></main>;
}
