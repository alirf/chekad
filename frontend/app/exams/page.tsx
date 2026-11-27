import type { Metadata } from "next";
import { Breadcrumbs, EmptyState, PageIntro } from "../../components/site-ui";

export const metadata: Metadata = {
  title: "آزمون‌های آزمایشی المپیاد",
  description: "فهرست آزمون‌های آزمایشی تخصصی المپیاد فیزیک و کامپیوتر چکاد.",
};

export default function ExamsPage() {
  return (
    <main id="main-content">
      <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "آزمون‌ها" }]} />
      <PageIntro eyebrow="OLYMPIAD EXAMS" title="برای سنجش آمادگی، نه فقط حل سؤال." description="آزمون‌های آزمایشی چکاد با تمرکز بر فضای تخصصی المپیاد فیزیک و کامپیوتر معرفی می‌شوند. اطلاعات هر آزمون پیش از انتشار نهایی و ثبت‌نام اعلام خواهد شد." />
      <section className="content-section">
        <div className="container">
          <div className="filter-bar" aria-label="فیلترهای آزمون">
            <input aria-label="جست‌وجوی آزمون" placeholder="جست‌وجوی آزمون..." disabled />
            <select aria-label="رشته المپیاد" disabled defaultValue=""><option value="">همه رشته‌ها</option><option>فیزیک</option><option>کامپیوتر</option></select>
            <select aria-label="مرحله آزمون" disabled defaultValue=""><option value="">همه مراحل</option><option>مرحله اول</option><option>مرحله دوم</option></select>
            <select aria-label="وضعیت ثبت‌نام" disabled defaultValue=""><option value="">همه وضعیت‌ها</option><option>فعال</option><option>به‌زودی</option><option>بسته‌شده</option><option>برگزارشده</option></select>
          </div>
          <EmptyState title="هنوز آزمونی برای نمایش منتشر نشده است" description="در حال حاضر API عمومی فهرست آزمون‌ها در backend وجود ندارد. پس از انتشار داده‌های واقعی، کارت‌ها، جست‌وجو و فیلترهای بالا فعال خواهند شد." icon="⌁" />
        </div>
      </section>
    </main>
  );
}
