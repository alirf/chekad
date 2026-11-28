import type { Metadata } from "next";
import Link from "next/link";
import { CmsPageOverride } from "../../components/cms-page-override";
import { Breadcrumbs } from "../../components/site-ui";
import { EditorialList } from "../../components/editorial-list";
import "./exams.css";

export const metadata: Metadata = {
  title: "آزمون‌های المپیاد | چکاد",
  description: "فهرست آزمون‌های منتشرشده المپیاد فیزیک و کامپیوتر و راهنمای ثبت‌نام از پنل دانش‌آموزی چکاد.",
};

const steps = [
  {
    number: "۰۱",
    symbol: "⌕",
    title: "آزمون مناسب را پیدا کن",
    description: "رشته، مرحله و زمان آزمون را در فهرست بررسی کن. وضعیت هر آزمون پیش از ورود مشخص شده است.",
  },
  {
    number: "۰۲",
    symbol: "↗",
    title: "از پنل دانش‌آموزی اقدام کن",
    description: "پس از ورود به حساب، آزمون‌های قابل مشاهده برای رشته حساب خودت را می‌بینی و در صورت فعال بودن، ثبت‌نام می‌کنی.",
  },
  {
    number: "۰۳",
    symbol: "✓",
    title: "وضعیت و نتیجه را پیگیری کن",
    description: "سابقه ثبت‌نام و وضعیت آزمون در پنل نمایش داده می‌شود. کارنامه نیز پس از تصحیح و انتشار قابل مشاهده خواهد بود.",
  },
];

const faqs = [
  {
    question: "چطور در آزمون ثبت‌نام کنم؟",
    answer: "برای ثبت‌نام وارد حساب دانش‌آموزی شو و به بخش آزمون‌ها برو. امکان ثبت‌نام به وضعیت آزمون، زمان‌بندی و رشته المپیاد حساب بستگی دارد.",
  },
  {
    question: "چرا بعضی آزمون‌ها را در پنل نمی‌بینم؟",
    answer: "آزمون‌ها بر اساس رشته المپیاد حساب نمایش داده می‌شوند. همچنین آزمون‌های پیش‌نویس در فهرست عمومی منتشر نمی‌شوند.",
  },
  {
    question: "کارنامه چه زمانی نمایش داده می‌شود؟",
    answer: "پس از تحویل پاسخ‌ها، تصحیح پاسخ‌های تشریحی در صورت وجود و انتشار رسمی نتیجه، کارنامه از پنل دانش‌آموزی قابل مشاهده خواهد بود.",
  },
  {
    question: "ثبت‌نام یعنی شرکت آنلاین در آزمون؟",
    answer: "خیر. ثبت‌نام فقط جایگاه تو را برای آزمون ثبت می‌کند. شروع آزمون و پاسخ‌گویی در زمان مجاز از مسیر پنل انجام می‌شود.",
  },
];

function ExamArtwork() {
  return (
    <div className="exams-art" aria-hidden="true">
      <div className="exams-orbit exams-orbit-one" />
      <div className="exams-orbit exams-orbit-two" />
      <div className="exams-art-core"><b>?</b><span>TEST YOUR THINKING</span></div>
      <div className="exams-art-node exams-art-physics"><b>∑</b><span>PHYSICS</span></div>
      <div className="exams-art-node exams-art-computer"><b>{"{ }"}</b><span>COMPUTER</span></div>
      <i className="exams-art-dot exams-dot-one" />
      <i className="exams-art-dot exams-dot-two" />
      <span className="exams-art-caption">PRACTICE · REVIEW · IMPROVE</span>
    </div>
  );
}

export default function ExamsPage() {
  return (
    <CmsPageOverride slug="exams">
      <main id="main-content" className="exams-page">
        <section className="exams-hero">
          <div className="exams-hero-grid" aria-hidden="true" />
          <div className="container">
            <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "آزمون‌ها" }]} />
            <div className="exams-hero-layout">
              <div className="exams-hero-copy">
                <span className="exams-kicker"><i /> سنجش برای شناخت بهتر مسیر</span>
                <h1>فقط پاسخ نده؛<br /><em>شیوه‌ی فکرت را بسنج.</em></h1>
                <p>
                  آزمون فرصتی است برای دیدن نقاط قوت، شناخت بخش‌هایی که به تمرین بیشتری نیاز دارند
                  و مرور روش حل مسئله. فهرست آزمون‌های منتشرشده فیزیک و کامپیوتر را اینجا دنبال کن.
                </p>
                <div className="exams-hero-actions">
                  <Link href="#published-exams" className="exams-button exams-button-primary">دیدن فهرست آزمون‌ها <span>↓</span></Link>
                  <Link href="/dashboard/exams" className="exams-button exams-button-outline">ورود به پنل آزمون‌ها</Link>
                </div>
                <div className="exams-hero-points">
                  <span><i>✓</i> المپیاد فیزیک</span>
                  <span><i>✓</i> المپیاد کامپیوتر</span>
                  <span><i>✓</i> پیگیری از پنل دانش‌آموزی</span>
                </div>
              </div>
              <ExamArtwork />
            </div>
          </div>
          <div className="exams-hero-baseline">
            <div className="container"><span>CHEKAD · OLYMPIAD EXAMS</span><i /><span>PHYSICS</span><i /><span>COMPUTER SCIENCE</span><b>هر آزمون، فرصتی برای یادگیری</b></div>
          </div>
        </section>

        <section className="exams-steps-section">
          <div className="container">
            <header className="exams-section-heading">
              <span className="exams-eyebrow">HOW IT WORKS</span>
              <h2>از انتخاب آزمون تا پیگیری نتیجه.</h2>
              <p>مراحل شرکت در آزمون در پنل دانش‌آموزی انجام می‌شود.</p>
            </header>
            <div className="exams-steps-grid">
              {steps.map((step) => (
                <article className="exams-step-card" key={step.number}>
                  <div className="exams-step-top"><span>{step.number}</span><b aria-hidden="true">{step.symbol}</b></div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="exams-list-section" id="published-exams">
          <div className="container">
            <header className="exams-section-heading exams-list-heading">
              <span className="exams-eyebrow">AVAILABLE EXAMS</span>
              <h2>فهرست آزمون‌ها</h2>
              <p>آزمون‌های منتشرشده و وضعیت آن‌ها در این بخش نمایش داده می‌شوند. جزئیات ثبت‌نام و امکان شرکت را از پنل دانش‌آموزی پیگیری کن.</p>
            </header>
            <EditorialList kind="exams" />
            <div className="exams-list-footnote">
              <span>یادآوری</span>
              <p>آزمون‌های پیش‌نویس عمومی نیستند. ثبت‌نام نیز فقط زمانی ممکن است که آزمون برای رشته حساب دانش‌آموز و در بازه مجاز فعال باشد.</p>
              <Link href="/dashboard/exams">رفتن به پنل آزمون‌ها <b>←</b></Link>
            </div>
          </div>
        </section>

        <section className="exams-faq-section">
          <div className="container exams-faq-layout">
            <header className="exams-section-heading exams-faq-heading">
              <span className="exams-eyebrow">FAQ</span>
              <h2>پرسش‌های متداول</h2>
              <p>پاسخ کوتاه به چند پرسش درباره آزمون‌ها و ثبت‌نام.</p>
            </header>
            <div className="exams-faq-list">
              {faqs.map((item, index) => (
                <details className="exams-faq-item" key={item.question}>
                  <summary><span>{String(index + 1).padStart(2, "0")}</span><b>{item.question}</b><i aria-hidden="true">+</i></summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="exams-final-section">
          <div className="container exams-final-panel">
            <div><span>YOUR STUDENT PORTAL</span><h2>آماده‌ای آزمون‌های رشته‌ات را ببینی؟</h2><p>برای مشاهده آزمون‌های حساب خودت وارد پنل دانش‌آموزی شو.</p></div>
            <Link href="/dashboard/exams">ورود به پنل دانش‌آموزی <b>←</b></Link>
            <strong aria-hidden="true">∑</strong>
          </div>
        </section>
      </main>
    </CmsPageOverride>
  );
}
