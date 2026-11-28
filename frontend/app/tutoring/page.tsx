import type { Metadata } from "next";
import Link from "next/link";
import { RemotePeople } from "../../components/remote-people";
import { RequestForm } from "../../components/request-form";
import { isPublicApplicationIntakeEnabled } from "../../lib/public-intake";
import "./tutoring.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "کلاس خصوصی المپیاد فیزیک و کامپیوتر | چکاد",
  description: "برای یادگیری عمیق‌تر مباحث المپیاد، حل مسئله و رفع اشکال، درخواست کلاس خصوصی تخصصی خود را در چکاد ثبت کنید.",
};

const benefits = [
  {
    number: "۰۱",
    icon: "⌘",
    title: "تمرکز روی نیاز تو",
    description: "موضوعی را که در آن به آموزش، تمرین یا رفع اشکال نیاز داری مشخص می‌کنی؛ جلسه حول همان نیاز پیش می‌رود.",
  },
  {
    number: "۰۲",
    icon: "◈",
    title: "مدرس متناسب با موضوع",
    description: "درخواستت بر اساس رشته و موضوع آموزشی بررسی می‌شود تا درباره مدرس مناسب‌تر گفت‌وگو کنیم.",
  },
  {
    number: "۰۳",
    icon: "↗",
    title: "توافق روشن پیش از شروع",
    description: "زمان‌بندی، شیوه برگزاری و هزینه قبل از شروع کلاس اعلام می‌شود و تصمیم نهایی با تو و خانواده‌ات است.",
  },
];

const process = [
  { number: "۱", title: "نیاز آموزشی را مشخص کن", description: "رشته و مبحثی را که می‌خواهی بهتر یاد بگیری یا در آن رفع اشکال کنی بنویس." },
  { number: "۲", title: "درخواست را ثبت کن", description: "از حساب دانش‌آموزی وارد فرم شو و اطلاعات تکمیلی را ارسال کن." },
  { number: "۳", title: "بررسی و هماهنگی", description: "تیم چکاد درخواست را بررسی می‌کند و برای معرفی مدرس و جزئیات کلاس با شما هماهنگ می‌شود." },
  { number: "۴", title: "با توافق دوطرفه شروع کن", description: "پس از اطلاع از مدرس، زمان‌بندی و هزینه و موافقت شما و سرپرست، کلاس آغاز می‌شود." },
];

const faqs = [
  {
    question: "کلاس خصوصی با منتورینگ چه تفاوتی دارد؟",
    answer: "کلاس خصوصی روی یادگیری مباحث علمی، حل مسئله و رفع اشکال تمرکز دارد. منتورینگ به مسیر کلی المپیاد، هدف‌گذاری، برنامه‌ریزی و پیگیری پیشرفت می‌پردازد.",
  },
  {
    question: "برای چه رشته‌هایی می‌توانم درخواست بدهم؟",
    answer: "در حال حاضر درخواست کلاس خصوصی برای المپیاد فیزیک و المپیاد کامپیوتر پذیرفته می‌شود.",
  },
  {
    question: "آیا قبل از ثبت درخواست باید مدرس را انتخاب کنم؟",
    answer: "خیر. ابتدا موضوع و نیاز آموزشی را ثبت می‌کنی. پس از بررسی، درباره گزینه‌های متناسب و ادامه فرایند با تو و خانواده‌ات هماهنگ می‌کنیم.",
  },
  {
    question: "هزینه کلاس چه زمانی مشخص می‌شود؟",
    answer: "هزینه و جزئیات کلاس پیش از شروع اعلام می‌شود. ثبت درخواست به‌تنهایی تعهدی برای پرداخت یا شروع همکاری ایجاد نمی‌کند.",
  },
  {
    question: "آیا می‌توانم فقط برای یک مبحث یا رفع اشکال درخواست بدهم؟",
    answer: "بله. می‌توانی یک مبحث مشخص، مجموعه‌ای از تمرین‌ها یا موضوعی را که در آن به توضیح بیشتر نیاز داری معرفی کنی.",
  },
  {
    question: "چطور درخواست را ثبت و پیگیری کنم؟",
    answer: "پس از ورود به حساب دانش‌آموزی، فرم درخواست را تکمیل می‌کنی. درخواست به همان حساب متصل می‌شود و کد پیگیری و وضعیت آن در پنل دانش‌آموزی نمایش داده می‌شود.",
  },
];

function TutoringArtwork() {
  return (
    <div className="tutoring-art" role="img" aria-label="تصویر مفهومی یادگیری و حل مسئله">
      <div className="tutoring-art-ring tutoring-ring-one" />
      <div className="tutoring-art-ring tutoring-ring-two" />
      <div className="tutoring-art-core">
        <span>چ</span>
        <small>CHEKAD</small>
      </div>
      <div className="tutoring-art-card tutoring-art-physics">
        <b>∑</b><span>PHYSICS</span><small>تحلیل و حل مسئله</small>
      </div>
      <div className="tutoring-art-card tutoring-art-code">
        <b>{"{ }"}</b><span>COMPUTER</span><small>منطق و الگوریتم</small>
      </div>
      <div className="tutoring-art-coordinate">LEARN · PRACTICE · UNDERSTAND</div>
      <i className="tutoring-art-dot tutoring-dot-a" />
      <i className="tutoring-art-dot tutoring-dot-b" />
      <i className="tutoring-art-dot tutoring-dot-c" />
    </div>
  );
}

export default function TutoringPage() {
  const intakeEnabled = isPublicApplicationIntakeEnabled();

  return (
    <main id="main-content" className="tutoring-page">
      <section className="tutoring-hero">
        <div className="tutoring-hero-grid" aria-hidden="true" />
        <div className="container">
          <nav className="tutoring-breadcrumb" aria-label="مسیر صفحه">
            <Link href="/">خانه</Link><span>/</span><span aria-current="page">کلاس خصوصی</span>
          </nav>
          <div className="tutoring-hero-layout">
            <div className="tutoring-hero-copy">
              <span className="tutoring-eyebrow"><i /> آموزش تخصصی برای یک نیاز مشخص</span>
              <h1>وقتی یک مبحث<br /><em>باید روشن‌تر شود.</em></h1>
              <p>
                کلاس خصوصی چکاد برای یادگیری عمیق‌تر، حل مسئله و رفع اشکال در مسیر المپیاد فیزیک و کامپیوتر است؛
                با تمرکز بر موضوعی که واقعاً به آن نیاز داری.
              </p>
              <div className="tutoring-hero-actions">
                <a className="tutoring-button tutoring-button-primary" href="#request">درخواست کلاس خصوصی <span aria-hidden="true">←</span></a>
                <a className="tutoring-button tutoring-button-outline" href="#how-it-works">مراحل همکاری</a>
              </div>
              <div className="tutoring-hero-points">
                <span><i>✓</i> ویژه فیزیک و کامپیوتر</span>
                <span><i>✓</i> تمرکز بر نیاز آموزشی</span>
                <span><i>✓</i> اعلام هزینه پیش از شروع</span>
              </div>
            </div>
            <TutoringArtwork />
          </div>
        </div>
        <div className="tutoring-hero-baseline">
          <div className="container">
            <span>CHEKAD · PRIVATE TUTORING</span><i /><span>PHYSICS</span><i /><span>COMPUTER SCIENCE</span>
            <b>یادگیری عمیق، قدم‌به‌قدم</b>
          </div>
        </div>
      </section>

      <section className="tutoring-benefits-section">
        <div className="container">
          <header className="tutoring-section-heading">
            <span className="tutoring-section-kicker">FOCUSED LEARNING</span>
            <h2>یک موضوع مشخص؛ یک جلسه هدفمند.</h2>
            <p>کلاس خصوصی قرار نیست یک نسخه یکسان برای همه باشد. موضوع و نیاز آموزشی تو نقطه شروع هماهنگی است.</p>
          </header>
          <div className="tutoring-benefit-grid">
            {benefits.map((benefit) => (
              <article className="tutoring-benefit-card" key={benefit.number}>
                <div className="tutoring-benefit-top"><span>{benefit.number}</span><b aria-hidden="true">{benefit.icon}</b></div>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="tutoring-scope-section">
        <div className="container tutoring-scope-layout">
          <div className="tutoring-scope-copy">
            <span className="tutoring-section-kicker">WHAT WE WORK ON</span>
            <h2>از فهم مفهوم تا حل مسئله.</h2>
            <p>در فرم درخواست، مبحث یا موضوعی را که برایت مهم است مشخص کن. می‌توانی نیازت را در حد یک عنوان کوتاه بنویسی و جزئیات بیشتر را در توضیحات اضافه کنی.</p>
            <Link href="#request" className="tutoring-inline-link">ثبت نیاز آموزشی <span>←</span></Link>
          </div>
          <div className="tutoring-scope-list">
            <article><span className="tutoring-scope-symbol">∑</span><div><b>المپیاد فیزیک</b><p>یادگیری مفاهیم، تحلیل مسئله، روش حل و رفع اشکال مباحث فیزیک.</p></div><i>PHYSICS</i></article>
            <article><span className="tutoring-scope-symbol">{"{ }"}</span><div><b>المپیاد کامپیوتر</b><p>درک مفاهیم الگوریتمی، حل تمرین و بررسی راه‌حل‌های برنامه‌نویسی.</p></div><i>COMPUTER</i></article>
            <div className="tutoring-scope-note"><span>نکته</span><p>کلاس خصوصی بر آموزش علمی تمرکز دارد؛ برای برنامه‌ریزی و پیگیری مسیر کلی المپیاد، صفحه منتورینگ را ببین.</p><Link href="/mentorship">آشنایی با منتورینگ <b>←</b></Link></div>
          </div>
        </div>
      </section>

      <section className="tutoring-process-section" id="how-it-works">
        <div className="container">
          <header className="tutoring-section-heading tutoring-section-heading-light">
            <span className="tutoring-section-kicker">HOW IT WORKS</span>
            <h2>از ثبت درخواست تا شروع کلاس.</h2>
            <p>جزئیات همکاری پیش از شروع روشن می‌شود تا با آگاهی تصمیم بگیری.</p>
          </header>
          <div className="tutoring-process-grid">
            {process.map((item, index) => (
              <article className="tutoring-process-step" key={item.number}>
                <div className="tutoring-process-number">{item.number}<span>{index < process.length - 1 ? "· · ·" : "✓"}</span></div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="tutoring-people-section">
        <div className="container">
          <header className="tutoring-section-heading">
            <span className="tutoring-section-kicker">MEET THE TUTORS</span>
            <h2>مدرسان چکاد</h2>
            <p>پس از بررسی نیاز آموزشی، درباره مدرس متناسب با موضوع و رشته‌ات با تو هماهنگ می‌کنیم.</p>
          </header>
          <RemotePeople
            kind="tutors"
            emptyTitle="فهرست مدرسان در حال تکمیل است."
            emptyDescription="برای بررسی نیاز آموزشی و اطلاع از گزینه‌های موجود، درخواست کلاس خصوصی را ثبت کن."
            failureTitle="در حال حاضر فهرست مدرسان در دسترس نیست."
            failureDescription="می‌توانی درخواستت را ثبت کنی تا تیم چکاد موضوع را بررسی و برای ادامه مسیر با تو هماهنگ کند."
          />
        </div>
      </section>

      <section className="tutoring-request-section" id="request">
        <div className="container tutoring-request-layout">
          <aside className="tutoring-request-aside">
            <span className="tutoring-section-kicker">YOUR LEARNING NEED</span>
            <h2>از کدام مبحث می‌خواهی عبور کنی؟</h2>
            <p>رشته و موضوع آموزشی موردنیازت را مشخص کن. درخواست به حساب دانش‌آموزی متصل می‌شود تا بتوانی وضعیت آن را در پنل پیگیری کنی.</p>
            <div className="tutoring-request-checklist">
              <span><i>✓</i> درخواست از حساب دانش‌آموزی</span>
              <span><i>✓</i> رضایت ولی یا سرپرست</span>
              <span><i>✓</i> اعلام جزئیات و هزینه پیش از شروع</span>
            </div>
            <div className="tutoring-contact-card">
              <b>برای پرسش بیشتر</b>
              <a href="tel:09918891553" dir="ltr">09918891553</a>
              <a href="https://t.me/alirf11" target="_blank" rel="noreferrer">@alirf11 در تلگرام</a>
            </div>
          </aside>
          <div className="tutoring-form-column">
            <div className="tutoring-form-heading">
              <span className="tutoring-section-kicker">PRIVATE CLASS REQUEST</span>
              <h2>درخواست کلاس خصوصی</h2>
              <p>ابتدا وارد حساب دانش‌آموزی شو. اطلاعات پایه از حسابت خوانده می‌شود و سپس می‌توانی موضوع آموزشی را ثبت کنی.</p>
            </div>
            <RequestForm kind="tutoring" enabled={intakeEnabled} />
          </div>
        </div>
      </section>

      <section className="tutoring-faq-section">
        <div className="container tutoring-faq-layout">
          <header className="tutoring-faq-heading">
            <span className="tutoring-section-kicker">FAQ</span>
            <h2>پرسش‌های متداول</h2>
            <p>پاسخ چند پرسش درباره کلاس خصوصی و روند ثبت درخواست.</p>
            <Link href="https://t.me/alirf11" target="_blank" rel="noreferrer">سؤال دیگری داری؟ با ما در ارتباط باش <span>←</span></Link>
          </header>
          <div className="tutoring-faq-list">
            {faqs.map((item, index) => (
              <details className="tutoring-faq-item" key={item.question}>
                <summary><span>{String(index + 1).padStart(2, "0")}</span><b>{item.question}</b><i aria-hidden="true">+</i></summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="tutoring-bottom-cta">
        <div className="container">
          <div className="tutoring-bottom-panel">
            <div><span>CHEKAD · NEXT STEP</span><h2>برای یادگیری متمرکز، از همین‌جا شروع کن.</h2><p>نیاز آموزشی‌ات را ثبت کن تا درباره قدم بعدی با تو هماهنگ کنیم.</p></div>
            <a href="#request">ثبت درخواست کلاس <b>←</b></a>
            <strong aria-hidden="true">چ</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
