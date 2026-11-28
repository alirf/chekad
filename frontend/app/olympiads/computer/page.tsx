import type { Metadata } from "next";
import Link from "next/link";
import { CmsPageOverride } from "../../../components/cms-page-override";
import { Breadcrumbs } from "../../../components/site-ui";
import { RemotePeople } from "../../../components/remote-people";
import "./computer.css";

export const metadata: Metadata = {
  title: "المپیاد کامپیوتر | چکاد",
  description: "با خدمات منتورینگ و کلاس خصوصی چکاد، مسیر المپیاد کامپیوتر را هدفمندتر دنبال کن.",
};

const abilities = [
  {
    number: "۰۱",
    symbol: "⌘",
    title: "تجزیه مسئله",
    description: "صورت مسئله را به بخش‌های کوچک‌تر تبدیل کن، محدودیت‌ها را بشناس و اطلاعات مهم را از جزئیات اضافی جدا کن.",
  },
  {
    number: "۰۲",
    symbol: "λ",
    title: "طراحی الگوریتم",
    description: "راه‌حلی بساز که مراحلش روشن باشد و بتوانی درباره دلیل انتخاب هر مرحله توضیح بدهی.",
  },
  {
    number: "۰۳",
    symbol: "⏱",
    title: "تحلیل و ارزیابی",
    description: "درستی راه‌حل و منابع موردنیاز آن را بررسی کن و برای حالت‌های مرزی و ورودی‌های متفاوت آماده باش.",
  },
];

const workflow = [
  { number: "۱", title: "نیازت را مشخص کن", description: "بگو در چه مبحث یا مهارتی به همراهی، آموزش یا رفع اشکال نیاز داری." },
  { number: "۲", title: "نوع همراهی را انتخاب کن", description: "برای مسیر و برنامه‌ریزی، منتورینگ؛ برای یادگیری مبحث و حل تمرین، کلاس خصوصی." },
  { number: "۳", title: "پس از هماهنگی شروع کن", description: "جزئیات خدمت، زمان‌بندی و هزینه پیش از شروع با تو و خانواده‌ات هماهنگ می‌شود." },
];

function ComputerArtwork() {
  return (
    <div className="computer-art" role="img" aria-label="تصویر مفهومی طراحی الگوریتم و تحلیل مسئله">
      <div className="computer-art-glow" />
      <div className="computer-art-orbit computer-orbit-a" />
      <div className="computer-art-orbit computer-orbit-b" />
      <div className="computer-code-window">
        <div className="computer-code-top"><span /><span /><span /><b>solution.cpp</b></div>
        <div className="computer-code-lines" aria-hidden="true">
          <i><b>01</b><span>for</span> (int i = 0; i &lt; n; ++i) {"{"}</i>
          <i><b>02</b><em>  update</em>(state, i);</i>
          <i><b>03</b>{"  if"} (valid(state)) {"{"}</i>
          <i><b>04</b><strong>    answer</strong> += value;</i>
          <i><b>05</b>{"  }"}</i>
          <i><b>06</b>{"}"}</i>
        </div>
      </div>
      <div className="computer-art-node computer-node-a"><b>{"{ }"}</b><span>ALGORITHM</span></div>
      <div className="computer-art-node computer-node-b"><b>O(n)</b><span>ANALYSIS</span></div>
      <div className="computer-art-connector computer-connector-a" />
      <div className="computer-art-connector computer-connector-b" />
      <i className="computer-art-point computer-point-a" />
      <i className="computer-art-point computer-point-b" />
      <span className="computer-art-caption">THINK · DESIGN · PROVE</span>
    </div>
  );
}

export default function ComputerOlympiadPage() {
  return (
    <CmsPageOverride slug="olympiad-computer">
      <main id="main-content" className="computer-page">
        <section className="computer-hero">
          <div className="computer-hero-grid" aria-hidden="true" />
          <div className="container">
            <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "المپیاد کامپیوتر" }]} />
            <div className="computer-hero-layout">
              <div className="computer-hero-copy">
                <span className="computer-kicker"><i /> مسیر المپیاد کامپیوتر</span>
                <h1>مسئله را تحلیل کن؛<br /><em>راه‌حل را طراحی کن.</em></h1>
                <p>
                  در المپیاد کامپیوتر، فقط رسیدن به یک پاسخ مهم نیست؛ باید مسئله را درست بفهمی،
                  راه‌حل قابل دفاع بسازی و کارایی آن را بررسی کنی. چکاد برای همراهی در این مسیر کنار توست.
                </p>
                <div className="computer-hero-actions">
                  <Link href="/mentorship/apply" className="computer-button computer-button-primary">درخواست منتورینگ <span>←</span></Link>
                  <Link href="/tutoring" className="computer-button computer-button-outline">کلاس خصوصی کامپیوتر</Link>
                </div>
                <div className="computer-hero-points">
                  <span><i>✓</i> تفکر الگوریتمی</span>
                  <span><i>✓</i> حل مسئله و تحلیل</span>
                  <span><i>✓</i> آموزش و رفع اشکال</span>
                </div>
              </div>
              <ComputerArtwork />
            </div>
          </div>
          <div className="computer-hero-baseline">
            <div className="container"><span>CHEKAD · COMPUTER OLYMPIAD</span><i /><span>ALGORITHMS</span><i /><span>PROBLEM SOLVING</span><b>از ایده تا راه‌حل قابل دفاع</b></div>
          </div>
        </section>

        <section className="computer-mindset-section">
          <div className="container computer-mindset-layout">
            <header className="computer-section-heading">
              <span className="computer-eyebrow">THINK IN ALGORITHMS</span>
              <h2>قبل از کدنویسی، مسئله را دقیق بفهم.</h2>
            </header>
            <div className="computer-mindset-copy">
              <p>شروع یک راه‌حل خوب، خواندن دقیق صورت مسئله و شناخت ورودی‌ها، خروجی‌ها و محدودیت‌هاست. وقتی مسئله را درست صورت‌بندی کنی، پیدا کردن ایده و انتخاب روش مناسب هم ساده‌تر می‌شود.</p>
              <p>بعد از طراحی الگوریتم، باید درستی آن را با استدلال بررسی کنی و ببینی برای اندازه ورودی‌های موردنظر، زمان و حافظه کافی دارد یا نه.</p>
            </div>
          </div>
        </section>

        <section className="computer-abilities-section">
          <div className="container">
            <header className="computer-section-heading computer-section-heading-center">
              <span className="computer-eyebrow">CORE SKILLS</span>
              <h2>سه بخش مهم از شیوه حل مسئله.</h2>
              <p>تمرین این مهارت‌ها کمک می‌کند راه‌حل‌هایت روشن‌تر، دقیق‌تر و قابل ارزیابی باشند.</p>
            </header>
            <div className="computer-abilities-grid">
              {abilities.map((item) => (
                <article className="computer-ability-card" key={item.number}>
                  <div className="computer-ability-top"><span>{item.number}</span><b aria-hidden="true">{item.symbol}</b></div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="computer-support-section">
          <div className="container">
            <header className="computer-section-heading">
              <span className="computer-eyebrow">HOW CHEKAD SUPPORTS YOU</span>
              <h2>برای هر نیاز، همراهی مناسب خودش.</h2>
              <p>منتورینگ و کلاس خصوصی دو خدمت جداگانه‌اند؛ انتخاب میان آن‌ها به چیزی بستگی دارد که اکنون برای پیشرفت به آن نیاز داری.</p>
            </header>
            <div className="computer-support-grid">
              <article className="computer-support-card computer-support-mentor">
                <div className="computer-support-symbol"><span>↗</span><small>01 · MENTORSHIP</small></div>
                <div className="computer-support-copy">
                  <span>برای مسیر کلی المپیاد</span>
                  <h3>منتورینگ کامپیوتر</h3>
                  <p>برای هدف‌گذاری، تنظیم برنامه، اولویت‌بندی و مرور منظم روند پیشرفت با همراهی منتور.</p>
                  <Link href="/mentorship">آشنایی با منتورینگ <b>←</b></Link>
                </div>
              </article>
              <article className="computer-support-card computer-support-tutor">
                <div className="computer-support-symbol"><span>{"{ }"}</span><small>02 · PRIVATE CLASS</small></div>
                <div className="computer-support-copy">
                  <span>برای یک نیاز علمی مشخص</span>
                  <h3>کلاس خصوصی کامپیوتر</h3>
                  <p>برای یادگیری یک مبحث، حل تمرین الگوریتمی و بررسی راه‌حل با مدرس متناسب با موضوع.</p>
                  <Link href="/tutoring">آشنایی با کلاس خصوصی <b>←</b></Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="computer-process-section">
          <div className="container">
            <header className="computer-section-heading computer-section-heading-light">
              <span className="computer-eyebrow">A CLEAR START</span>
              <h2>شروع مسیر، ساده و شفاف.</h2>
              <p>از شناخت نیاز تا هماهنگی برای شروع، قدم بعدی را می‌دانی.</p>
            </header>
            <div className="computer-process-grid">
              {workflow.map((item, index) => (
                <article className="computer-process-step" key={item.number}>
                  <div className="computer-process-number">{item.number}<span>{index < workflow.length - 1 ? "· · ·" : "✓"}</span></div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="computer-mentors-section">
          <div className="container">
            <header className="computer-section-heading">
              <span className="computer-eyebrow">COMPUTER SCIENCE MENTORS</span>
              <h2>همراهان مسیر کامپیوتر</h2>
              <p>با زمینه تخصصی و تجربه منتورها آشنا شو و برای انتخاب همراه مناسب، اطلاعات روشن‌تری داشته باش.</p>
            </header>
            <RemotePeople
              kind="mentors"
              field="computer"
              emptyTitle="پروفایل عمومی منتورهای کامپیوتر هنوز منتشر نشده است."
              emptyDescription="برای بررسی نیازت و اطلاع از گزینه‌های همراهی، درخواست منتورینگ را ثبت کن."
              failureTitle="در حال حاضر فهرست منتورها در دسترس نیست."
              failureDescription="می‌توانی درخواستت را ثبت کنی تا تیم چکاد نیاز آموزشی‌ات را بررسی کند."
            />
          </div>
        </section>

        <section className="computer-final-section">
          <div className="container computer-final-panel">
            <div>
              <span>YOUR NEXT STEP</span>
              <h2>برای مسیر کامپیوترت، از یک قدم روشن شروع کن.</h2>
              <p>نیازت را مشخص کن تا درباره نوع همراهی مناسب با تو گفت‌وگو کنیم.</p>
            </div>
            <div className="computer-final-actions">
              <Link href="/mentorship/apply">درخواست منتورینگ <b>←</b></Link>
              <Link href="/tutoring">درخواست کلاس خصوصی <b>←</b></Link>
            </div>
            <strong aria-hidden="true">{"{ }"}</strong>
          </div>
        </section>
      </main>
    </CmsPageOverride>
  );
}
