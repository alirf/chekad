import type { Metadata } from "next";
import Link from "next/link";
import { CmsPageOverride } from "../../../components/cms-page-override";
import { Breadcrumbs } from "../../../components/site-ui";
import { RemotePeople } from "../../../components/remote-people";
import "./physics.css";

export const metadata: Metadata = {
  title: "المپیاد فیزیک | چکاد",
  description: "با خدمات منتورینگ و کلاس خصوصی چکاد، مسیر المپیاد فیزیک را هدفمندتر دنبال کن.",
};

const abilities = [
  {
    number: "۰۱",
    symbol: "⌖",
    title: "مدل‌سازی پدیده‌ها",
    description: "از یک موقعیت فیزیکی، مدل و فرض‌های مناسب بساز و مشخص کن چه چیزهایی در مسئله اهمیت دارند.",
  },
  {
    number: "۰۲",
    symbol: "∑",
    title: "استدلال مرحله‌به‌مرحله",
    description: "رابطه‌ها را فقط به خاطر نسپار؛ مسیر رسیدن به آن‌ها و ارتباطشان با مفهوم فیزیکی را دنبال کن.",
  },
  {
    number: "۰۳",
    symbol: "↗",
    title: "تحلیل و بازبینی راه‌حل",
    description: "نتیجه را از نظر واحدها، تقریب‌ها و سازگاری با شرایط مسئله بررسی کن و از اشتباه‌ها یاد بگیر.",
  },
];

const workflow = [
  { number: "۱", title: "وضعیت فعلی را بشناس", description: "موضوعی را که در آن به همراهی یا آموزش نیاز داری مشخص کن." },
  { number: "۲", title: "نوع کمک را انتخاب کن", description: "برای مسیر و برنامه‌ریزی، منتورینگ؛ برای یادگیری مبحث و رفع اشکال، کلاس خصوصی." },
  { number: "۳", title: "با هماهنگی شروع کن", description: "پس از بررسی نیاز و توافق درباره جزئیات، همکاری را آغاز کن." },
];

function PhysicsArtwork() {
  return (
    <div className="physics-art" role="img" aria-label="تصویر مفهومی حرکت و تحلیل فیزیکی">
      <div className="physics-art-glow" />
      <div className="physics-orbit physics-orbit-a" />
      <div className="physics-orbit physics-orbit-b" />
      <div className="physics-axis physics-axis-x" />
      <div className="physics-axis physics-axis-y" />
      <div className="physics-core"><b>F</b><span>PHYSICS</span></div>
      <div className="physics-vector physics-vector-a"><i /><span>v</span></div>
      <div className="physics-vector physics-vector-b"><i /><span>F</span></div>
      <div className="physics-point physics-point-a" />
      <div className="physics-point physics-point-b" />
      <div className="physics-art-label physics-art-label-a"><b>∑ F</b><small>تحلیل نیروها</small></div>
      <div className="physics-art-label physics-art-label-b"><b>Δx / Δt</b><small>تغییرات و اندازه‌گیری</small></div>
      <span className="physics-art-caption">OBSERVE · MODEL · SOLVE</span>
    </div>
  );
}

export default function PhysicsOlympiadPage() {
  return (
    <CmsPageOverride slug="olympiad-physics">
      <main id="main-content" className="physics-page">
        <section className="physics-hero">
          <div className="physics-hero-grid" aria-hidden="true" />
          <div className="container">
            <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "المپیاد فیزیک" }]} />
            <div className="physics-hero-layout">
              <div className="physics-hero-copy">
                <span className="physics-kicker"><i /> مسیر المپیاد فیزیک</span>
                <h1>پدیده را بفهم؛<br /><em>مسئله را حل کن.</em></h1>
                <p>
                  فیزیک فقط جای‌گذاری عددها در فرمول نیست. دیدن ارتباط میان مفهوم‌ها،
                  ساختن مدل مناسب و پیگیری یک استدلال دقیق، بخش مهمی از حل مسئله است.
                  چکاد برای همراهی در این مسیر کنار توست.
                </p>
                <div className="physics-hero-actions">
                  <Link href="/mentorship/apply" className="physics-button physics-button-primary">درخواست منتورینگ <span>←</span></Link>
                  <Link href="/tutoring" className="physics-button physics-button-outline">کلاس خصوصی فیزیک</Link>
                </div>
                <div className="physics-hero-points">
                  <span><i>✓</i> همراهی مسیر المپیاد</span>
                  <span><i>✓</i> آموزش و رفع اشکال</span>
                  <span><i>✓</i> تمرکز بر فهم مفهومی</span>
                </div>
              </div>
              <PhysicsArtwork />
            </div>
          </div>
          <div className="physics-hero-baseline">
            <div className="container"><span>CHEKAD · PHYSICS OLYMPIAD</span><i /><span>OBSERVATION</span><i /><span>REASONING</span><b>از فهم عمیق تا راه‌حل دقیق</b></div>
          </div>
        </section>

        <section className="physics-mindset-section">
          <div className="container physics-mindset-layout">
            <header className="physics-section-heading">
              <span className="physics-eyebrow">A PHYSICS MINDSET</span>
              <h2>به‌جای حفظ راه‌حل، شیوه فکرکردن را تمرین کن.</h2>
            </header>
            <div className="physics-mindset-copy">
              <p>در مواجهه با یک مسئله، اولین قدم همیشه پیدا کردن فرمول نیست. باید صورت مسئله را دقیق بخوانی، اطلاعات مهم را جدا کنی و بین کمیت‌ها و مفهوم‌های فیزیکی ارتباط برقرار کنی.</p>
              <p>تمرین مؤثر یعنی بتوانی توضیح بدهی چرا یک روش را انتخاب کرده‌ای، از کجا به نتیجه رسیده‌ای و آیا پاسخ نهایی با شرایط مسئله سازگار است یا نه.</p>
            </div>
          </div>
        </section>

        <section className="physics-abilities-section">
          <div className="container">
            <header className="physics-section-heading physics-section-heading-center">
              <span className="physics-eyebrow">CORE SKILLS</span>
              <h2>مهارت‌هایی که در مسیرت رشد می‌دهی.</h2>
              <p>این‌ها بخشی از عادت‌های فکری مهم برای مطالعه و حل مسئله در فیزیک هستند.</p>
            </header>
            <div className="physics-abilities-grid">
              {abilities.map((item) => (
                <article className="physics-ability-card" key={item.number}>
                  <div className="physics-ability-top"><span>{item.number}</span><b aria-hidden="true">{item.symbol}</b></div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="physics-support-section">
          <div className="container">
            <header className="physics-section-heading">
              <span className="physics-eyebrow">HOW CHEKAD SUPPORTS YOU</span>
              <h2>برای هر نیاز، همراهی مناسب خودش.</h2>
              <p>دو خدمت اصلی چکاد دو نقش متفاوت دارند؛ می‌توانی بر اساس نیاز فعلی‌ات مسیر مناسب را انتخاب کنی.</p>
            </header>
            <div className="physics-support-grid">
              <article className="physics-support-card physics-support-mentor">
                <div className="physics-support-symbol"><span>↗</span><small>01 · MENTORSHIP</small></div>
                <div className="physics-support-copy">
                  <span>برای مسیر کلی المپیاد</span>
                  <h3>منتورینگ فیزیک</h3>
                  <p>برای هدف‌گذاری، تنظیم برنامه، اولویت‌بندی مباحث و مرور منظم روند پیشرفت با همراهی منتور.</p>
                  <Link href="/mentorship">آشنایی با منتورینگ <b>←</b></Link>
                </div>
              </article>
              <article className="physics-support-card physics-support-tutor">
                <div className="physics-support-symbol"><span>∑</span><small>02 · PRIVATE CLASS</small></div>
                <div className="physics-support-copy">
                  <span>برای یک نیاز علمی مشخص</span>
                  <h3>کلاس خصوصی فیزیک</h3>
                  <p>برای یادگیری عمیق‌تر یک مبحث، حل تمرین و رفع اشکال علمی با مدرس متناسب با موضوع.</p>
                  <Link href="/tutoring">آشنایی با کلاس خصوصی <b>←</b></Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="physics-process-section">
          <div className="container">
            <header className="physics-section-heading physics-section-heading-light">
              <span className="physics-eyebrow">A CLEAR START</span>
              <h2>شروع مسیر، ساده و شفاف.</h2>
              <p>از شناخت نیاز تا هماهنگی برای شروع، قدم بعدی را می‌دانی.</p>
            </header>
            <div className="physics-process-grid">
              {workflow.map((item, index) => (
                <article className="physics-process-step" key={item.number}>
                  <div className="physics-process-number">{item.number}<span>{index < workflow.length - 1 ? "· · ·" : "✓"}</span></div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="physics-mentors-section">
          <div className="container">
            <header className="physics-section-heading">
              <span className="physics-eyebrow">PHYSICS MENTORS</span>
              <h2>همراهان مسیر فیزیک</h2>
              <p>با زمینه تخصصی و تجربه منتورها آشنا شو و برای انتخاب همراه مناسب، اطلاعات روشن‌تری داشته باش.</p>
            </header>
            <RemotePeople
              kind="mentors"
              field="physics"
              emptyTitle="پروفایل عمومی منتورهای فیزیک هنوز منتشر نشده است."
              emptyDescription="برای بررسی نیازت و اطلاع از گزینه‌های همراهی، درخواست منتورینگ را ثبت کن."
              failureTitle="در حال حاضر فهرست منتورها در دسترس نیست."
              failureDescription="می‌توانی درخواستت را ثبت کنی تا تیم چکاد نیاز آموزشی‌ات را بررسی کند."
            />
          </div>
        </section>

        <section className="physics-final-section">
          <div className="container physics-final-panel">
            <div>
              <span>YOUR NEXT STEP</span>
              <h2>برای مسیر فیزیکت، از یک قدم روشن شروع کن.</h2>
              <p>نیازت را مشخص کن تا درباره نوع همراهی مناسب با تو گفت‌وگو کنیم.</p>
            </div>
            <div className="physics-final-actions">
              <Link href="/mentorship/apply">درخواست منتورینگ <b>←</b></Link>
              <Link href="/tutoring">درخواست کلاس خصوصی <b>←</b></Link>
            </div>
            <strong aria-hidden="true">∑</strong>
          </div>
        </section>
      </main>
    </CmsPageOverride>
  );
}
