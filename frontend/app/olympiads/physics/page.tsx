import type { Metadata } from "next";
import { Breadcrumbs, CtaBanner, FeatureList, PageIntro, SectionHeading } from "../../../components/site-ui";
import { RemotePeople } from "../../../components/remote-people";

export const metadata: Metadata = {
  title: "المپیاد فیزیک",
  description: "خدمات چکاد برای مسیر المپیاد فیزیک؛ منتورینگ، تدریس خصوصی و آزمون‌های تخصصی.",
};

export default function PhysicsOlympiadPage() {
  return (
    <main id="main-content">
      <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "المپیاد فیزیک" }]} />
      <PageIntro eyebrow="PHYSICS OLYMPIAD" title="فیزیک را عمیق‌تر بفهم؛ مسئله‌ها را دقیق‌تر حل کن." description="مسیر المپیاد فیزیک به فهم مفهومی، مدل‌سازی و صبر در مواجهه با مسئله‌های چندمرحله‌ای نیاز دارد. چکاد برای همراهی در این مسیر طراحی شده است." >
        <a href="/mentorship/apply" className="button button-primary">درخواست منتورینگ فیزیک <span aria-hidden="true">←</span></a>
        <a href="/exams" className="button button-secondary">آزمون‌های فیزیک</a>
      </PageIntro>
      <section className="content-section">
        <div className="container split-content">
          <div className="prose">
            <span className="eyebrow">A PHYSICS MINDSET</span>
            <h2>از فهم پدیده تا ساختن راه‌حل</h2>
            <p>در المپیاد فیزیک، شناخت مفهوم‌ها و ارتباط میان آن‌ها اهمیت زیادی دارد. توانایی صورت‌بندی مسئله، انتخاب مدل مناسب و پیگیری استدلال، بخشی از مهارت حل مسئله است.</p>
            <p>چکاد تلاش می‌کند خدمات همراهی و آموزش را متناسب با مرحله و نیاز علمی دانش‌آموز ارائه کند.</p>
          </div>
          <FeatureList items={["منتورینگ برای برنامه‌ریزی و پیگیری مسیر", "کلاس خصوصی برای آموزش و رفع اشکال علمی", "آزمون‌های آزمایشی تخصصی پس از انتشار برنامه", "دسترسی به محتوای تحریریه پس از انتشار"]} />
        </div>
      </section>
      <section className="content-section content-section-soft">
        <div className="container">
          <SectionHeading eyebrow="PHYSICS MENTORS" title="همراهان مسیر فیزیک" description="فهرست زیر از API عمومی مشاوران دریافت می‌شود. تنها اطلاعات تأییدشده و منتشرشده نمایش داده می‌شود." />
          <RemotePeople kind="mentors" field="physics" />
        </div>
      </section>
      <CtaBanner title="مسیر فیزیکت را با شناخت بهتر شروع کن." description="نیاز و هدف خود را توضیح بده تا برای همراهی تخصصی بررسی شود." />
    </main>
  );
}
