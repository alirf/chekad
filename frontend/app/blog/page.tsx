import type { Metadata } from "next";
import { Breadcrumbs, EmptyState, PageIntro } from "../../components/site-ui";

export const metadata: Metadata = {
  title: "مجله تخصصی چکاد",
  description: "اخبار، راهنماها و تجربه‌های تخصصی مسیر المپیاد فیزیک و کامپیوتر.",
};

export default function BlogPage() {
  return (
    <main id="main-content">
      <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "مجله چکاد" }]} />
      <PageIntro eyebrow="CHEKAD JOURNAL" title="دانش، تجربه و نگاه عمیق‌تر به المپیاد." description="مجله چکاد برای روایت مسیر المپیاد، بررسی ایده‌ها و انتشار محتوای تخصصی فیزیک و کامپیوتر شکل می‌گیرد." />
      <section className="content-section">
        <div className="container">
          <div className="article-placeholder" aria-hidden="true">CHEKAD JOURNAL · EDITORIAL SPACE</div>
          <div className="filter-bar" style={{ marginTop: 24 }}>
            <input aria-label="جست‌وجو در مقالات" placeholder="جست‌وجو در مقالات..." disabled />
            <select aria-label="دسته‌بندی مقاله" disabled defaultValue=""><option value="">همه دسته‌بندی‌ها</option><option>اخبار المپیاد</option><option>المپیاد فیزیک</option><option>المپیاد کامپیوتر</option><option>راهنمای مطالعه</option><option>منابع و مسیر آموزشی</option><option>تجربه‌ها و مصاحبه‌ها</option></select>
            <span className="filter-results">دسته‌بندی‌ها پس از انتشار محتوا فعال می‌شوند.</span>
          </div>
          <EmptyState title="هنوز مقاله‌ای منتشر نشده است" description="سرویس فعلی محتوا، داده‌های عمومی متنی کلید/مقدار را ارائه می‌دهد و endpoint فهرست مقالات و دسته‌بندی‌ها هنوز پیاده‌سازی نشده است." icon="▤" />
        </div>
      </section>
    </main>
  );
}
