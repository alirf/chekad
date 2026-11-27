import type { Metadata } from "next";
import { Breadcrumbs, PageIntro } from "../../components/site-ui";
import { EditorialList } from "../../components/editorial-list";

export const metadata: Metadata = {
  title: "آزمون‌های آزمایشی المپیاد",
  description: "فهرست آزمون‌های آزمایشی تخصصی المپیاد فیزیک و کامپیوتر چکاد.",
};

export default function ExamsPage() {
  return (
    <main id="main-content">
      <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "آزمون‌ها" }]} />
      <PageIntro eyebrow="OLYMPIAD EXAMS" title="برای سنجش آمادگی، نه فقط حل سؤال." description="آزمون‌های آزمایشی چکاد برای المپیاد فیزیک و کامپیوتر؛ وضعیت و جزئیات هر آزمون پیش از ثبت‌نام اعلام می‌شود." />
      <section className="content-section"><div className="container"><EditorialList kind="exams" /></div></section>
    </main>
  );
}
