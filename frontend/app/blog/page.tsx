import type { Metadata } from "next";
import Link from "next/link";
import { CmsPageOverride } from "../../components/cms-page-override";
import { Breadcrumbs } from "../../components/site-ui";
import { EditorialList } from "../../components/editorial-list";
import "./blog.css";

export const metadata: Metadata = {
  title: "مجله چکاد | مقاله‌ها و تجربه‌های المپیاد",
  description: "یادداشت‌ها، راهنماها و تجربه‌های منتشرشده درباره مسیر المپیاد فیزیک و کامپیوتر.",
};

function JournalArtwork() {
  return (
    <div className="blog-art" aria-hidden="true">
      <div className="blog-art-orbit blog-art-orbit-one" />
      <div className="blog-art-orbit blog-art-orbit-two" />
      <div className="blog-book">
        <div className="blog-book-page blog-book-page-left">
          <i /><i /><i /><b />
        </div>
        <div className="blog-book-page blog-book-page-right">
          <span>چ</span><i /><i /><i />
        </div>
        <div className="blog-book-spine" />
      </div>
      <div className="blog-art-tag blog-art-tag-one"><b>IDEA</b><span>یک پرسش خوب</span></div>
      <div className="blog-art-tag blog-art-tag-two"><b>INSIGHT</b><span>نگاهی عمیق‌تر</span></div>
      <i className="blog-art-dot blog-art-dot-one" />
      <i className="blog-art-dot blog-art-dot-two" />
      <span className="blog-art-caption">READ · THINK · DISCOVER</span>
    </div>
  );
}

export default function BlogPage() {
  return (
    <CmsPageOverride slug="blog">
      <main id="main-content" className="blog-page">
        <section className="blog-hero">
          <div className="blog-hero-grid" aria-hidden="true" />
          <div className="container">
            <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "مجله چکاد" }]} />
            <div className="blog-hero-layout">
              <div className="blog-hero-copy">
                <span className="blog-kicker"><i /> مجله تخصصی چکاد</span>
                <h1>برای پرسش‌های بهتر،<br /><em>نگاه عمیق‌تر بساز.</em></h1>
                <p>
                  مجموعه‌ای از مقاله‌ها، راهنماها و تجربه‌های مرتبط با مسیر المپیاد؛
                  برای اینکه مفاهیم را دقیق‌تر ببینی، روش مطالعه‌ات را بهتر بشناسی و با فکر روشن‌تری ادامه بدهی.
                </p>
                <div className="blog-hero-actions">
                  <a className="blog-button blog-button-primary" href="#articles">مطالعه مقاله‌ها <span>↓</span></a>
                  <Link href="/about" className="blog-button blog-button-outline">درباره رویکرد چکاد</Link>
                </div>
                <div className="blog-hero-points">
                  <span><i>✓</i> محتوای مرتبط با فیزیک</span>
                  <span><i>✓</i> محتوای مرتبط با کامپیوتر</span>
                  <span><i>✓</i> فقط مطالب منتشرشده</span>
                </div>
              </div>
              <JournalArtwork />
            </div>
          </div>
          <div className="blog-hero-baseline">
            <div className="container"><span>CHEKAD · JOURNAL</span><i /><span>PHYSICS</span><i /><span>COMPUTER SCIENCE</span><b>دانش را بخوان، به پرسش تبدیل کن</b></div>
          </div>
        </section>

        <section className="blog-intro-section">
          <div className="container blog-intro-layout">
            <div className="blog-intro-mark"><span>01</span><b>چ</b></div>
            <div>
              <span className="blog-eyebrow">A PLACE FOR IDEAS</span>
              <h2>یادگیری با یک پاسخ تمام نمی‌شود.</h2>
              <p>گاهی یک توضیح دقیق، تجربه‌ای کوتاه یا زاویه دید تازه کمک می‌کند مسئله‌ای را بهتر بفهمی. مجله چکاد برای جمع‌آوری همین محتواهای مفید و قابل‌استفاده است؛ مطالبی که پس از انتشار، می‌توانی هر زمان به آن‌ها برگردی.</p>
            </div>
          </div>
        </section>

        <section className="blog-articles-section" id="articles">
          <div className="container">
            <header className="blog-section-heading">
              <div><span className="blog-eyebrow">THE JOURNAL</span><h2>مطالب منتشرشده</h2></div>
              <p>موضوع موردنظرت را انتخاب کن یا میان تازه‌ترین نوشته‌ها جست‌وجو کن.</p>
            </header>
            <EditorialList kind="articles" />
          </div>
        </section>

        <section className="blog-bottom-section">
          <div className="container blog-bottom-panel">
            <div>
              <span>KEEP MOVING FORWARD</span>
              <h2>مطالعه، بخشی از مسیر است؛ نه تمام آن.</h2>
              <p>برای همراهی در برنامه‌ریزی مسیر یا یادگیری یک مبحث، با خدمات چکاد بیشتر آشنا شو.</p>
            </div>
            <div className="blog-bottom-actions">
              <Link href="/mentorship">منتورینگ <b>←</b></Link>
              <Link href="/tutoring">کلاس خصوصی <b>←</b></Link>
            </div>
            <strong aria-hidden="true">C.</strong>
          </div>
        </section>
      </main>
    </CmsPageOverride>
  );
}
