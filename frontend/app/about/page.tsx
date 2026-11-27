import type { Metadata } from "next";
import { CmsPageOverride } from "../../components/cms-page-override";
import { Breadcrumbs, PageIntro } from "../../components/site-ui";

export const metadata: Metadata = {
  title: "درباره چکاد",
  description: "آشنایی با نگاه و حوزه فعالیت مؤسسه چکاد در المپیادهای دانش‌آموزی.",
};

export default function AboutPage() {
  return (
    <CmsPageOverride slug="about">
    <main id="main-content">
      <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "درباره چکاد" }]} />
      <PageIntro eyebrow="ABOUT CHEKAD" title="برای مسیرهای جدی، همراهی دقیق‌تر." description="چکاد مجموعه‌ای تخصصی در حوزه المپیادهای دانش‌آموزی فیزیک و کامپیوتر است؛ با تمرکز بر منتورینگ، کلاس خصوصی، آزمون و محتوای هدفمند." />
      <section className="content-section">
        <div className="container content-narrow prose">
          <h2>نگاه چکاد</h2>
          <p>باور ما این است که پیشرفت در مسیر المپیاد فقط به حجم منابع و ساعت مطالعه وابسته نیست. شناخت مسیر، انتخاب اولویت‌ها، تمرین درست و دریافت بازخورد نیز اهمیت دارند.</p>
          <p>به همین دلیل چکاد خدمات خود را حول همراهی تخصصی و سنجش هدفمند سازمان می‌دهد؛ نه رقابت بر سر تعداد دوره‌ها.</p>
          <div className="about-values">
            <div className="value-card"><h3>تخصص</h3><p>تمرکز بر دو حوزه مشخص فیزیک و کامپیوتر.</p></div>
            <div className="value-card"><h3>شفافیت</h3><p>اعلام اطلاعات واقعی و پرهیز از ادعاهای تأییدنشده.</p></div>
            <div className="value-card"><h3>همراهی</h3><p>توجه به مسیر هر دانش‌آموز و نیازهای متفاوت او.</p></div>
          </div>
        </div>
      </section>
    </main>
    </CmsPageOverride>
  );
}
