import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, EmptyState } from "../../../components/site-ui";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "مقاله مجله چکاد",
    description: "مقاله تخصصی درباره المپیادهای دانش‌آموزی.",
  };
}

export default function BlogArticlePage({ params }: { params: { slug: string } }) {
  if (!params.slug || params.slug.length > 160) notFound();

  return (
    <main id="main-content">
      <Breadcrumbs items={[{ href: "/", label: "خانه" }, { href: "/blog", label: "مجله" }, { label: "مقاله" }]} />
      <article className="content-section">
        <div className="container article-body">
          <div className="article-meta"><span>مجله چکاد</span><span>محتوای در انتظار انتشار</span></div>
          <h1>این مقاله هنوز منتشر نشده است.</h1>
          <div className="article-placeholder" aria-hidden="true">ARTICLE COVER</div>
          <p>برای این نشانی مقاله منتشرشده‌ای در منبع داده فعلی وجود ندارد. محتوای نمونه یا اطلاعات نویسنده و تاریخ ساختگی نمایش داده نمی‌شود.</p>
          <EmptyState title="به‌زودی محتوای تأییدشده منتشر می‌شود" description="پس از اضافه‌شدن API مقالات و داده‌های تحریریه، متن، تصویر شاخص، زمان مطالعه و مطالب مرتبط در این صفحه قرار می‌گیرند." icon="▤" />
        </div>
      </article>
    </main>
  );
}
