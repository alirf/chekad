import type { Metadata } from "next";
import { CmsPageOverride } from "../../components/cms-page-override";
import { Breadcrumbs, PageIntro } from "../../components/site-ui";
import { EditorialList } from "../../components/editorial-list";

export const metadata: Metadata = {
  title: "مجله تخصصی چکاد",
  description: "اخبار، راهنماها و تجربه‌های تخصصی مسیر المپیاد فیزیک و کامپیوتر.",
};

export default function BlogPage() {
  return (
    <CmsPageOverride slug="blog">
    <main id="main-content">
      <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "مجله چکاد" }]} />
      <PageIntro eyebrow="CHEKAD JOURNAL" title="دانش، تجربه و نگاه عمیق‌تر به المپیاد." description="مقاله‌ها و تجربه‌های تخصصی چکاد درباره مسیر المپیاد فیزیک و کامپیوتر." />
      <section className="content-section"><div className="container"><EditorialList kind="articles" /></div></section>
    </main>
    </CmsPageOverride>
  );
}
