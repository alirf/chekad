import type { Metadata } from "next";
import Link from "next/link";
import { CmsPageOverride } from "../../components/cms-page-override";
import { RemotePeople } from "../../components/remote-people";
import "./mentorship.css";

export const metadata: Metadata = {
  title: "مشاوره و منتورینگ المپیاد",
  description:
    "با همراهی منتوری باتجربه، مسیر المپیاد فیزیک یا کامپیوتر را روشن‌تر کن؛ از برنامه‌ریزی تا پیگیری پیشرفت.",
  openGraph: {
    title: "منتورینگ تخصصی المپیاد | چکاد",
    description:
      "همراهی فردی، برنامه‌ریزی متناسب و گفت‌وگوی منظم برای دانش‌آموزان المپیاد فیزیک و کامپیوتر.",
    type: "website",
    locale: "fa_IR",
  },
};

const benefits = [
  {
    number: "۰۱",
    icon: "⌖",
    title: "شناخت مسیر",
    description:
      "برای هدف‌گذاری، شناخت اولویت‌ها و انتخاب قدم بعدی، با فردی باتجربه گفت‌وگو می‌کنی.",
  },
  {
    number: "۰۲",
    icon: "◷",
    title: "برنامه متناسب",
    description:
      "برنامه مطالعه با توجه به پایه، سطح فعلی، زمان در دسترس و هدف آموزشی تو شکل می‌گیرد.",
  },
  {
    number: "۰۳",
    icon: "↗",
    title: "پیگیری پیشرفت",
    description:
      "در گفت‌وگوهای منظم، روند اجرا بررسی می‌شود و در صورت نیاز برنامه دوباره تنظیم می‌شود.",
  },
];

const process = [
  {
    number: "۱",
    title: "درخواستت را ثبت کن",
    description: "رشته، پایه، سطح فعلی و انتظارت از منتورینگ را برای ما بفرست.",
  },
  {
    number: "۲",
    title: "درباره نیازت گفت‌وگو می‌کنیم",
    description: "با شناخت بهتر شرایط و هدف تو، مسیر مناسب‌تری برای همراهی مشخص می‌کنیم.",
  },
  {
    number: "۳",
    title: "منتور پیشنهادی را انتخاب کن",
    description: "اطلاعات و زمینه تخصصی گزینه‌های متناسب را می‌بینی و انتخاب نهایی با توست.",
  },
  {
    number: "۴",
    title: "همراهی را آغاز کن",
    description: "پس از توافق درباره جزئیات، برنامه‌ریزی و پیگیری مسیر شروع می‌شود.",
  },
];

const faqs = [
  {
    question: "منتورینگ با کلاس خصوصی چه تفاوتی دارد؟",
    answer:
      "منتورینگ به مسیر کلی المپیاد می‌پردازد: هدف‌گذاری، برنامه‌ریزی، اولویت‌بندی و پیگیری پیشرفت. کلاس خصوصی برای یادگیری یک مبحث علمی، حل مسئله و رفع اشکال تخصصی است.",
  },
  {
    question: "برای شروع باید در چه سطحی باشم؟",
    answer:
      "برای شروع، لازم نیست از قبل به سطح مشخصی رسیده باشی. شناخت سطح فعلی بخشی از گفت‌وگوی ابتدایی است و برنامه بر اساس شرایط تو تنظیم می‌شود.",
  },
  {
    question: "ارتباط با منتور چگونه انجام می‌شود؟",
    answer:
      "برای هر دانش‌آموز یک گروه اختصاصی تلگرام با حضور دانش‌آموز و منتور تشکیل می‌شود تا هماهنگی‌ها، پرسش‌ها و پیگیری برنامه در یک مسیر مشخص انجام شود.",
  },
  {
    question: "هزینه و جزئیات جلسات چه زمانی مشخص می‌شود؟",
    answer:
      "پیش از شروع همکاری، جزئیات خدمت، تعداد و زمان جلسات و هزینه به‌صورت روشن اعلام می‌شود. تصمیم‌گیری برای شروع همکاری پس از اطلاع از این جزئیات انجام می‌شود.",
  },
  {
    question: "منتورینگ برای کدام المپیادها ارائه می‌شود؟",
    answer:
      "خدمات فعلی چکاد بر المپیاد فیزیک و المپیاد کامپیوتر متمرکز است.",
  },
];

function Arrow() {
  return <span aria-hidden="true">←</span>;
}

function MentorshipArtwork() {
  return (
    <div className="mentorship-art" aria-label="تصویر مفهومی مسیر پیشرفت و قله" role="img">
      <div className="mentorship-art-orbit mentorship-art-orbit-one" />
      <div className="mentorship-art-orbit mentorship-art-orbit-two" />
      <svg viewBox="0 0 620 470" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="mentorshipPeak" x1="140" y1="110" x2="470" y2="400" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5E8ED5" />
            <stop offset="1" stopColor="#213D62" />
          </linearGradient>
          <linearGradient id="mentorshipPath" x1="130" y1="390" x2="430" y2="93" gradientUnits="userSpaceOnUse">
            <stop stopColor="#20B6B5" />
            <stop offset="1" stopColor="#F2B35A" />
          </linearGradient>
        </defs>
        <path d="M66 389 193 208l66 87 108-175 184 269H66Z" fill="#1C3555" stroke="#6888AE" strokeOpacity=".44" strokeWidth="2" />
        <path d="m193 208 66 87 108-175 184 269H256l-63-181Z" fill="url(#mentorshipPeak)" opacity=".8" />
        <path d="m331 120 36 53-26-8-10-45Z" fill="#D6E4F3" opacity=".8" />
        <path d="m193 208 34 44-27-4-7-40Z" fill="#B7CBE0" opacity=".7" />
        <path d="M104 374c58-8 71-45 109-64 37-19 60 7 92-26 35-36 35-93 83-122 17-11 38-18 83-19" stroke="url(#mentorshipPath)" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 13" />
        <path d="m454 133 18 10-17 10" stroke="#F2B35A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="104" cy="374" r="8" fill="#20B6B5" stroke="#D8F6F1" strokeWidth="4" />
        <circle cx="305" cy="284" r="9" fill="#F2B35A" stroke="#FFF0D7" strokeWidth="4" />
        <circle cx="471" cy="143" r="10" fill="#F2B35A" stroke="#FFF0D7" strokeWidth="4" />
        <path d="M75 414h470" stroke="#91A9C5" strokeOpacity=".25" strokeWidth="2" />
        <path d="M115 428h116" stroke="#20B6B5" strokeOpacity=".65" strokeWidth="2" strokeLinecap="round" />
        <path d="M245 428h52" stroke="#F2B35A" strokeOpacity=".65" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="mentorship-art-label mentorship-art-label-top">
        <span className="mentorship-art-label-icon">↗</span>
        <span><b>قدم بعدی</b><small>روشن‌تر و هدفمندتر</small></span>
      </div>
      <div className="mentorship-art-label mentorship-art-label-bottom">
        <span className="mentorship-art-label-icon">✓</span>
        <span><b>برنامه متناسب</b><small>با شرایط هر دانش‌آموز</small></span>
      </div>
      <span className="mentorship-art-coordinate mentorship-art-coordinate-one">35°42&apos; N</span>
      <span className="mentorship-art-coordinate mentorship-art-coordinate-two">THE NEXT SUMMIT</span>
    </div>
  );
}

export default function MentorshipPage() {
  return (
    <CmsPageOverride slug="mentorship">
      <main id="main-content" className="mentorship-page">
        <section className="mentorship-hero">
          <div className="mentorship-hero-grid" aria-hidden="true" />
          <div className="container">
            <nav className="mentorship-breadcrumb" aria-label="مسیر صفحه">
              <Link href="/">خانه</Link><span>/</span><span aria-current="page">مشاوره و منتورینگ</span>
            </nav>
            <div className="mentorship-hero-layout">
              <div className="mentorship-hero-copy">
                <span className="mentorship-eyebrow"><i /> همراهی تخصصی مسیر المپیاد</span>
                <h1>برای رسیدن به قله،<br /><em>مسیرت را بشناس.</em></h1>
                <p>
                  منتورینگ چکاد، همراهی فردی و هدفمند برای دانش‌آموزان المپیاد فیزیک و کامپیوتر است؛
                  از شناخت مسیر و برنامه‌ریزی تا بررسی پیشرفت و انتخاب قدم بعدی.
                </p>
                <div className="mentorship-hero-actions">
                  <Link href="/mentorship/apply" className="mentorship-button mentorship-button-primary">
                    درخواست منتورینگ <Arrow />
                  </Link>
                  <Link href="#mentorship-process" className="mentorship-button mentorship-button-ghost">
                    آشنایی با مراحل همکاری
                  </Link>
                </div>
                <div className="mentorship-hero-points">
                  <span><i>✓</i> ویژه فیزیک و کامپیوتر</span>
                  <span><i>✓</i> برنامه‌ریزی متناسب</span>
                  <span><i>✓</i> ارتباط مستقیم با منتور</span>
                </div>
              </div>
              <MentorshipArtwork />
            </div>
          </div>
          <div className="mentorship-hero-baseline">
            <div className="container">
              <span>CHEKAD · MENTORSHIP</span><i /><span>PHYSICS</span><i /><span>COMPUTER SCIENCE</span>
              <b>یک مسیر روشن‌تر، قدم‌به‌قدم</b>
            </div>
          </div>
        </section>

        <section className="mentorship-benefits-section">
          <div className="container">
            <div className="mentorship-section-heading">
              <span className="mentorship-section-kicker">WHY MENTORSHIP</span>
              <h2>همراهی فقط برای درس‌خواندن نیست.</h2>
              <p>گاهی یک گفت‌وگوی درست، اولویت روشن و برنامه قابل اجرا، مسیر را منظم‌تر می‌کند.</p>
            </div>
            <div className="mentorship-benefit-grid">
              {benefits.map((benefit) => (
                <article className="mentorship-benefit-card" key={benefit.number}>
                  <div className="mentorship-benefit-top"><span>{benefit.number}</span><b aria-hidden="true">{benefit.icon}</b></div>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mentorship-fit-section">
          <div className="container mentorship-fit-layout">
            <div className="mentorship-fit-copy">
              <span className="mentorship-section-kicker">A CLEARER ROUTE</span>
              <h2>از سردرگمی تا یک برنامه قابل اجرا.</h2>
              <p>
                مسیر المپیاد طولانی و پر از انتخاب است. منتور کمک می‌کند تصویر روشن‌تری از وضعیت فعلی،
                هدف‌ها و اولویت‌ها داشته باشی؛ تا انرژی‌ات صرف قدم‌هایی شود که واقعاً به مسیرت کمک می‌کنند.
              </p>
              <Link href="/mentorship/apply" className="mentorship-text-link">شروع درخواست <Arrow /></Link>
            </div>
            <div className="mentorship-fit-list">
              <article><span>۰۱</span><div><b>هدف‌ها را دقیق‌تر کن</b><p>بدانی برای چه چیزی تلاش می‌کنی و چه چیزی در اولویت است.</p></div></article>
              <article><span>۰۲</span><div><b>برنامه‌ای قابل اجرا داشته باش</b><p>برنامه با زمان، سطح و شرایط واقعی تو هماهنگ باشد.</p></div></article>
              <article><span>۰۳</span><div><b>پیشرفتت را مرور کن</b><p>نتیجه تلاش‌ها و چالش‌های مسیر را در گفت‌وگوهای منظم بررسی کن.</p></div></article>
              <article><span>۰۴</span><div><b>در تصمیم‌های مهم تنها نباش</b><p>برای تغییر اولویت‌ها و انتخاب قدم بعدی، همراهی باتجربه داشته باش.</p></div></article>
            </div>
          </div>
        </section>

        <section className="mentorship-process-section" id="mentorship-process">
          <div className="container">
            <div className="mentorship-section-heading mentorship-section-heading-light">
              <span className="mentorship-section-kicker">HOW IT WORKS</span>
              <h2>شروع همکاری، ساده و شفاف.</h2>
              <p>از ثبت درخواست تا آغاز همراهی، در هر مرحله می‌دانی قدم بعدی چیست.</p>
            </div>
            <div className="mentorship-process-grid">
              {process.map((item, index) => (
                <article className="mentorship-process-step" key={item.number}>
                  <div className="mentorship-process-number">{item.number}<span>{index < process.length - 1 ? "· · ·" : "✓"}</span></div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mentorship-people-section">
          <div className="container">
            <div className="mentorship-section-heading">
              <span className="mentorship-section-kicker">MEET THE MENTORS</span>
              <h2>همراهان مسیر چکاد</h2>
              <p>با شناخت زمینه تخصصی و تجربه منتورها، انتخاب آگاهانه‌تری برای ادامه مسیر داشته باش.</p>
            </div>
            <RemotePeople
              kind="mentors"
              emptyTitle="آماده‌ای همراه مسیرت را پیدا کنی؟"
              emptyDescription="درخواستت را ثبت کن تا درباره نیاز و هدفت گفت‌وگو کنیم."
              failureTitle="برای آشنایی با منتورها با ما در ارتباط باش."
              failureDescription="از طریق فرم درخواست، شروع مسیر را با تیم چکاد هماهنگ کن."
            />
          </div>
        </section>

        <section className="mentorship-faq-section">
          <div className="container mentorship-faq-layout">
            <div className="mentorship-section-heading">
              <span className="mentorship-section-kicker">FAQ</span>
              <h2>پرسش‌های متداول</h2>
              <p>پاسخ چند پرسش مهم درباره منتورینگ چکاد.</p>
              <Link href="/contact" className="mentorship-text-link">سؤال دیگری داری؟ با ما در ارتباط باش <Arrow /></Link>
            </div>
            <div className="mentorship-faq-list">
              {faqs.map((item, index) => (
                <details key={item.question} className="mentorship-faq-item">
                  <summary><span>{String(index + 1).padStart(2, "0")}</span><b>{item.question}</b><i aria-hidden="true">+</i></summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mentorship-cta-section">
          <div className="container">
            <div className="mentorship-cta-panel">
              <div className="mentorship-cta-mark" aria-hidden="true">چ</div>
              <div className="mentorship-cta-copy">
                <span className="mentorship-section-kicker">YOUR NEXT STEP</span>
                <h2>قدم اول را بردار؛<br />بقیه مسیر را با هم روشن می‌کنیم.</h2>
                <p>درخواستت را ثبت کن تا گفت‌وگو درباره هدف و مسیر مناسب شروع شود.</p>
              </div>
              <div className="mentorship-cta-actions">
                <Link href="/mentorship/apply" className="mentorship-button mentorship-button-light">ثبت درخواست <Arrow /></Link>
                <a className="mentorship-contact-link" href="tel:09918891553">تماس با چکاد: ۰۹۹۱ ۸۸۹ ۱۵۵۳</a>
                <a className="mentorship-contact-link" href="https://t.me/alirf11" target="_blank" rel="noreferrer">تلگرام: @alirf11</a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </CmsPageOverride>
  );
}
