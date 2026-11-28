import type { Metadata } from "next";
import Link from "next/link";
import { CmsPageOverride } from "../../components/cms-page-override";
import { Breadcrumbs } from "../../components/site-ui";
import "./about.css";

export const metadata: Metadata = {
  title: "درباره چکاد | همراه مسیر المپیاد",
  description: "با نگاه چکاد به یادگیری المپیادی و خدمات منتورینگ و کلاس خصوصی فیزیک و کامپیوتر آشنا شو.",
};

const principles = [
  {
    number: "۰۱",
    symbol: "⌖",
    title: "شناخت نیاز پیش از پیشنهاد",
    description: "اول باید بدانیم دانش‌آموز در چه موضوعی به کمک نیاز دارد؛ بعد درباره مسیر و خدمت مناسب گفت‌وگو کنیم.",
  },
  {
    number: "۰۲",
    symbol: "↗",
    title: "همراهی متناسب با شرایط",
    description: "سطح، هدف و شرایط هر دانش‌آموز متفاوت است. برنامه و هماهنگی باید با همین تفاوت‌ها شکل بگیرد.",
  },
  {
    number: "۰۳",
    symbol: "◇",
    title: "شفافیت در همکاری",
    description: "جزئیات خدمت، زمان‌بندی و هزینه پیش از شروع اعلام می‌شود تا تصمیم‌گیری آگاهانه باشد.",
  },
];

const stages = [
  { number: "۱", title: "نیاز را روشن می‌کنیم", description: "موضوع، هدف و شرایط آموزشی دانش‌آموز را می‌شناسیم." },
  { number: "۲", title: "مسیر مناسب را پیدا می‌کنیم", description: "مشخص می‌کنیم منتورینگ، کلاس خصوصی یا گفت‌وگوی بیشتر مناسب‌تر است." },
  { number: "۳", title: "با توافق شروع می‌کنیم", description: "پس از هماهنگی درباره جزئیات و رضایت سرپرست، همکاری آغاز می‌شود." },
];

function AboutArtwork() {
  return (
    <div className="about-art" role="img" aria-label="تصویر مفهومی مسیر یادگیری و رسیدن به هدف">
      <div className="about-art-orbit about-art-orbit-a" />
      <div className="about-art-orbit about-art-orbit-b" />
      <div className="about-art-grid" />
      <div className="about-art-core"><b>چ</b><span>CHEKAD</span></div>
      <div className="about-art-node about-art-node-physics"><b>∑</b><span>PHYSICS</span></div>
      <div className="about-art-node about-art-node-code"><b>{"{ }"}</b><span>COMPUTER</span></div>
      <div className="about-art-line about-art-line-one" />
      <div className="about-art-line about-art-line-two" />
      <i className="about-art-point about-art-point-a" />
      <i className="about-art-point about-art-point-b" />
      <i className="about-art-point about-art-point-c" />
      <span className="about-art-caption">THINK · LEARN · PROGRESS</span>
    </div>
  );
}

export default function AboutPage() {
  return (
    <CmsPageOverride slug="about">
      <main id="main-content" className="about-page">
        <section className="about-hero">
          <div className="about-hero-pattern" aria-hidden="true" />
          <div className="container">
            <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "درباره چکاد" }]} />
            <div className="about-hero-layout">
              <div className="about-hero-copy">
                <span className="about-kicker"><i /> درباره چکاد</span>
                <h1>هر مسیر جدی،<br /><em>به همراهی درست نیاز دارد.</em></h1>
                <p>
                  چکاد برای دانش‌آموزانی شکل گرفته که مسیر المپیاد فیزیک یا کامپیوتر را جدی دنبال می‌کنند؛
                  با تمرکز بر شناخت نیاز آموزشی، منتورینگ و کلاس خصوصی.
                </p>
                <div className="about-hero-actions">
                  <Link href="/mentorship" className="about-button about-button-primary">آشنایی با منتورینگ <span>←</span></Link>
                  <Link href="/tutoring" className="about-button about-button-ghost">کلاس خصوصی</Link>
                </div>
                <div className="about-hero-points">
                  <span><i>✓</i> تمرکز بر فیزیک و کامپیوتر</span>
                  <span><i>✓</i> توجه به نیاز هر دانش‌آموز</span>
                </div>
              </div>
              <AboutArtwork />
            </div>
          </div>
          <div className="about-hero-baseline">
            <div className="container"><span>CHEKAD · ABOUT US</span><i /><span>PHYSICS</span><i /><span>COMPUTER SCIENCE</span><b>یادگیری هدفمند، همراهی روشن</b></div>
          </div>
        </section>

        <section className="about-belief-section">
          <div className="container about-belief-layout">
            <header className="about-section-heading">
              <span className="about-eyebrow">OUR APPROACH</span>
              <h2>المپیاد فقط جمع‌کردن منبع و ساعت مطالعه نیست.</h2>
            </header>
            <div className="about-belief-copy">
              <p>در مسیر المپیاد، گاهی مسئله اصلی پیدا کردن منبع بعدی نیست؛ شاید لازم باشد یک مفهوم بهتر فهمیده شود، یک راه‌حل بررسی شود یا اولویت‌های مطالعه دوباره مرتب شوند.</p>
              <p>نگاه چکاد از همین‌جا شروع می‌شود: ابتدا نیاز آموزشی را بشناسیم و سپس برای آن، شکل مناسبی از همراهی را پیشنهاد کنیم. نه یک نسخه ثابت برای همه، و نه وعده نتیجه‌ای که به عوامل زیادی وابسته است.</p>
            </div>
          </div>
        </section>

        <section className="about-services-section">
          <div className="container">
            <header className="about-section-heading about-section-heading-center">
              <span className="about-eyebrow">WHAT WE DO</span>
              <h2>دو مسیر برای دو نیاز متفاوت.</h2>
              <p>منتورینگ و کلاس خصوصی مکمل یکدیگرند، اما مسئله یکسانی را حل نمی‌کنند.</p>
            </header>
            <div className="about-service-grid">
              <article className="about-service-card about-service-mentorship">
                <div className="about-service-visual"><span>↗</span><i /><b>01</b></div>
                <div className="about-service-copy">
                  <span className="about-service-label">MENTORSHIP</span>
                  <h3>منتورینگ و همراهی مسیر</h3>
                  <p>برای هدف‌گذاری، برنامه‌ریزی، اولویت‌بندی و مرور منظم پیشرفت در مسیر المپیاد.</p>
                  <Link href="/mentorship">جزئیات منتورینگ <b>←</b></Link>
                </div>
              </article>
              <article className="about-service-card about-service-tutoring">
                <div className="about-service-visual"><span>∑</span><i /><b>02</b></div>
                <div className="about-service-copy">
                  <span className="about-service-label">PRIVATE TUTORING</span>
                  <h3>کلاس خصوصی و رفع اشکال</h3>
                  <p>برای یادگیری عمیق‌تر یک مبحث، حل مسئله و گفت‌وگوی علمی با مدرس متناسب.</p>
                  <Link href="/tutoring">جزئیات کلاس خصوصی <b>←</b></Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="about-principles-section">
          <div className="container">
            <header className="about-section-heading">
              <span className="about-eyebrow">OUR PRINCIPLES</span>
              <h2>چند اصل ساده در شیوه کار ما.</h2>
              <p>این اصول باید در تجربه واقعی همکاری دیده شوند، نه فقط در شعارها.</p>
            </header>
            <div className="about-principles-grid">
              {principles.map((item) => (
                <article className="about-principle-card" key={item.number}>
                  <div className="about-principle-top"><span>{item.number}</span><b aria-hidden="true">{item.symbol}</b></div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="about-process-section">
          <div className="container">
            <header className="about-section-heading about-section-heading-light">
              <span className="about-eyebrow">HOW WE START</span>
              <h2>شروع همکاری باید روشن باشد.</h2>
              <p>قبل از آغاز هر خدمت، مسیر و جزئیات را با دانش‌آموز و خانواده‌اش هماهنگ می‌کنیم.</p>
            </header>
            <div className="about-process-grid">
              {stages.map((stage, index) => (
                <article className="about-process-step" key={stage.number}>
                  <div className="about-process-number">{stage.number}<span>{index < stages.length - 1 ? "· · ·" : "✓"}</span></div>
                  <h3>{stage.title}</h3>
                  <p>{stage.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="about-commitment-section">
          <div className="container">
            <div className="about-commitment-panel">
              <div className="about-commitment-copy">
                <span className="about-eyebrow">A CLEAR COMMITMENT</span>
                <h2>شفافیت، قبل از هر تصمیم.</h2>
                <p>ثبت درخواست به‌تنهایی به معنی شروع همکاری یا پرداخت نیست. پیش از آغاز، درباره خدمت، زمان‌بندی و هزینه گفت‌وگو می‌کنیم. برای دانش‌آموزان زیر ۱۸ سال نیز اطلاع و رضایت ولی یا سرپرست لازم است.</p>
                <div className="about-commitment-links">
                  <Link href="/terms">قوانین استفاده <span>←</span></Link>
                  <Link href="/privacy">حریم خصوصی <span>←</span></Link>
                </div>
              </div>
              <div className="about-commitment-mark" aria-hidden="true"><b>چ</b><span>CHEKAD</span><i /></div>
            </div>
          </div>
        </section>

        <section className="about-final-section">
          <div className="container about-final-panel">
            <div><span>YOUR NEXT STEP</span><h2>ببین کدام مسیر برایت مناسب‌تر است.</h2><p>با خدمات چکاد آشنا شو یا درباره نیاز آموزشی‌ات با ما گفت‌وگو کن.</p></div>
            <div className="about-final-actions">
              <Link href="/mentorship">منتورینگ <b>←</b></Link>
              <Link href="/tutoring">کلاس خصوصی <b>←</b></Link>
            </div>
          </div>
        </section>
      </main>
    </CmsPageOverride>
  );
}
