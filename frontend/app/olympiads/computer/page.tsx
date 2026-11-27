import type { Metadata } from "next";
import { CmsPageOverride } from "../../../components/cms-page-override";
import Link from "next/link";
import { Breadcrumbs, CtaBanner, FeatureList, PageIntro, SectionHeading } from "../../../components/site-ui";
import { RemotePeople } from "../../../components/remote-people";

export const metadata: Metadata = {
  title: "المپیاد کامپیوتر",
  description: "خدمات چکاد برای مسیر المپیاد کامپیوتر؛ منتورینگ، تدریس خصوصی و آزمون‌های تخصصی.",
};

export default function ComputerOlympiadPage() {
  return (
    <CmsPageOverride slug="olympiad-computer">
    <main id="main-content">
      <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "المپیاد کامپیوتر" }]} />
      <PageIntro eyebrow="COMPUTER SCIENCE OLYMPIAD" title="مسئله را بشناس؛ الگوریتم را با دقت بساز." description="المپیاد کامپیوتر با تفکر الگوریتمی، خلاقیت در طراحی راه‌حل و تحلیل دقیق مسئله گره خورده است. چکاد برای همراهی تخصصی در این مسیر فعالیت می‌کند." >
        <Link href="/mentorship/apply" className="button button-primary">درخواست منتورینگ کامپیوتر <span aria-hidden="true">←</span></Link>
        <Link href="/exams" className="button button-secondary">آزمون‌های کامپیوتر</Link>
      </PageIntro>
      <section className="content-section">
        <div className="container split-content">
          <div className="prose">
            <span className="eyebrow">THINK IN ALGORITHMS</span>
            <h2>از تحلیل مسئله تا راه‌حل قابل دفاع</h2>
            <p>در مسیر المپیاد کامپیوتر، توانایی تجزیه مسئله، انتخاب الگوریتم، تحلیل پیچیدگی و ارزیابی راه‌حل اهمیت دارد. تمرین هدفمند و بازبینی شیوه فکرکردن می‌تواند مسیر یادگیری را منظم‌تر کند.</p>
            <p>چکاد میان همراهی بلندمدت در مسیر و آموزش متمرکز یک مبحث تفاوت قائل است و این دو نیاز را در قالب خدمات جداگانه ارائه می‌کند.</p>
          </div>
          <FeatureList items={["منتورینگ برای برنامه‌ریزی و پیگیری مسیر", "کلاس خصوصی برای الگوریتم و مباحث علمی", "آزمون‌های آزمایشی تخصصی پس از انتشار برنامه", "مقاله‌ها و تجربه‌ها پس از انتشار تحریریه"]} />
        </div>
      </section>
      <section className="content-section content-section-soft">
        <div className="container">
          <SectionHeading eyebrow="COMPUTER SCIENCE MENTORS" title="همراهان مسیر کامپیوتر" description="فهرست زیر از API عمومی مشاوران دریافت می‌شود و اطلاعات نمونه یا منتشرنشده در آن نمایش داده نمی‌شود." />
          <RemotePeople kind="mentors" field="computer" />
        </div>
      </section>
      <CtaBanner title="برای مسئله‌های دشوار، مسیر روشن‌تری بساز." description="از توضیح نیاز و هدف خود شروع کن تا گزینه‌های همراهی تخصصی بررسی شوند." />
    </main>
    </CmsPageOverride>
  );
}
