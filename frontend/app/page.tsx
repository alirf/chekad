import type { Metadata } from "next";
import "./home-redesign.css";
import Link from "next/link";
import { CmsPageOverride } from "../components/cms-page-override";
import { RemotePeople } from "../components/remote-people";

export const metadata: Metadata = {
  title: "چکاد | همراه مطمئن شما در مسیر المپیاد",
  description:
    "چکاد همراه دانش‌آموزان المپیاد فیزیک و کامپیوتر است؛ با منتورینگ تخصصی، کلاس خصوصی و برنامه‌ریزی متناسب با نیاز هر دانش‌آموز.",
  openGraph: {
    title: "چکاد | همراه مطمئن شما در مسیر المپیاد",
    description:
      "منتورینگ و کلاس خصوصی تخصصی برای دانش‌آموزان المپیاد فیزیک و کامپیوتر.",
    type: "website",
    locale: "fa_IR",
  },
};

const processSteps = [
  {
    number: "۰۱",
    title: "نیازت را مشخص کن",
    text: "رشته و نوع همراهی موردنظرت را انتخاب کن و درخواست را با اطلاعات لازم ثبت کن.",
  },
  {
    number: "۰۲",
    title: "درخواست بررسی می‌شود",
    text: "تیم چکاد شرایط و هدف آموزشی را بررسی می‌کند تا گزینه‌های متناسب مشخص شوند.",
  },
  {
    number: "۰۳",
    title: "گزینه‌ها را بشناس و انتخاب کن",
    text: "اطلاعات افراد پیشنهادی در اختیار دانش‌آموز قرار می‌گیرد تا انتخاب آگاهانه‌ای داشته باشد.",
  },
  {
    number: "۰۴",
    title: "همراهی را شروع کن",
    text: "پس از هماهنگی، مسیر ارتباط و جزئیات ادامه همکاری با شفافیت مشخص می‌شود.",
  },
];

const faqs = [
  {
    question: "چکاد در چه رشته‌هایی فعالیت می‌کند؟",
    answer:
      "تمرکز فعلی چکاد بر المپیاد فیزیک و المپیاد کامپیوتر است. خدمات و محتوای سایت نیز بر اساس نیازهای همین دو مسیر طراحی می‌شوند.",
  },
  {
    question: "منتورینگ چه تفاوتی با کلاس خصوصی دارد؟",
    answer:
      "منتورینگ برای هدایت مسیر، برنامه‌ریزی، تعیین اولویت‌ها و پیگیری روند پیشرفت است. کلاس خصوصی روی آموزش یک مبحث علمی، حل تمرین و رفع اشکال متمرکز می‌شود.",
  },
  {
    question: "بعد از ثبت درخواست چه اتفاقی می‌افتد؟",
    answer:
      "درخواست توسط تیم چکاد بررسی می‌شود. سپس گزینه‌های متناسب با نیاز دانش‌آموز معرفی می‌شوند تا امکان انتخاب آگاهانه وجود داشته باشد.",
  },
  {
    question: "آیا می‌توانم منتور یا مدرس را خودم انتخاب کنم؟",
    answer:
      "بله. پس از بررسی درخواست و معرفی گزینه‌های متناسب، انتخاب نهایی از میان گزینه‌های پیشنهادی با دانش‌آموز است.",
  },
  {
    question: "آیا چکاد دوره آموزشی ضبط‌شده ارائه می‌کند؟",
    answer:
      "تمرکز فعلی خدمات چکاد بر منتورینگ و کلاس خصوصی تخصصی است؛ نه رقابت مستقیم در تولید دوره‌های عمومی و انبوه.",
  },
];

function Arrow() {
  return <span aria-hidden="true">←</span>;
}

function BenefitIcon({ kind }: { kind: "target" | "people" | "progress" | "shield" }) {
  if (kind === "target") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 5 41 12v11c0 10-7 16-17 20C14 39 7 33 7 23V12L24 5Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <path d="m16 24 5 5 11-12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "people") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="14" r="7" fill="currentColor" />
        <circle cx="10" cy="18" r="5" fill="currentColor" opacity=".8" />
        <circle cx="38" cy="18" r="5" fill="currentColor" opacity=".8" />
        <path d="M10 39c0-8 5-13 14-13s14 5 14 13v2H10v-2Z" fill="currentColor" />
        <path d="M2 39c0-6 3-10 9-11m35 11c0-6-3-10-9-11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "progress") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M6 39h37" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M10 32V24h7v8m6 0V15h7v17m6 0V8h7v24" fill="currentColor" opacity=".9" />
        <path d="m8 17 10-7 8 4 14-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M34 5h6v6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="m24 5 17 7v11c0 10-7 16-17 20C14 39 7 33 7 23V12l17-7Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="m17 24 5 5 10-11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <CmsPageOverride slug="home">
      <main id="main-content" className="home-page">
        <section className="home-hero">
          <div
            className="home-hero-photo"
            role="img"
            aria-label="کوهنوردی بر فراز قله و چشم‌انداز کوهستان در طلوع آفتاب"
          />
          <div className="home-hero-rings" aria-hidden="true" />
          <div className="container home-hero-grid">
            <div className="home-hero-copy">
              <span className="home-eyebrow">
                مؤسسه مشاوره و پشتیبانی المپیادهای علمی
              </span>
              <h1>
                چکاد؛ همراه مطمئن شما
                <br />
                در مسیر <span>المپیاد</span>
              </h1>
              <p className="home-hero-description">
                منتورینگ تخصصی، کلاس‌های خصوصی و برنامه‌ریزی حرفه‌ای برای موفقیت
                در المپیاد فیزیک و کامپیوتر.
              </p>
              <div className="home-hero-actions">
                <Link href="/mentorship/apply" className="button button-primary button-large">
                  شروع مسیر با چکاد <Arrow />
                </Link>
                <Link href="/mentorship" className="button button-secondary button-large">
                  معرفی خدمات <span aria-hidden="true">▷</span>
                </Link>
              </div>
              <div className="home-hero-dots" aria-hidden="true">
                <span className="is-active" />
                <span />
                <span />
              </div>
            </div>
          </div>
        </section>

        <section className="home-olympiad-promo" aria-label="مسیرهای تخصصی چکاد">
          <div className="container home-olympiad-promo-grid">
            <Link href="/olympiads/physics" className="home-promo-card home-promo-physics">
              <div className="home-promo-copy">
                <h2>المپیاد فیزیک</h2>
                <p>همراهی حرفه‌ای در مسیر المپیاد فیزیک</p>
              </div>
              <span className="home-promo-arrow" aria-hidden="true">←</span>
              <span className="home-promo-art home-promo-art-physics" aria-hidden="true">
                <svg viewBox="0 0 128 88" fill="none">
                  <ellipse cx="64" cy="44" rx="51" ry="17" stroke="currentColor" strokeWidth="2.5" transform="rotate(-27 64 44)" />
                  <ellipse cx="64" cy="44" rx="51" ry="17" stroke="currentColor" strokeWidth="2.5" transform="rotate(27 64 44)" />
                  <ellipse cx="64" cy="44" rx="17" ry="51" stroke="currentColor" strokeWidth="2.5" />
                  <circle cx="64" cy="44" r="7" fill="#ffb02e" />
                  <circle cx="16" cy="29" r="4" fill="#8bd3ff" />
                  <circle cx="106" cy="64" r="4" fill="#8bd3ff" />
                  <circle cx="78" cy="1" r="3" fill="#ffb02e" />
                </svg>
              </span>
            </Link>
            <Link href="/olympiads/computer" className="home-promo-card home-promo-computer">
              <div className="home-promo-copy">
                <h2>المپیاد کامپیوتر</h2>
                <p>آماده‌سازی تخصصی برای موفقیت در المپیاد کامپیوتر</p>
              </div>
              <span className="home-promo-arrow" aria-hidden="true">←</span>
              <span className="home-promo-art home-promo-art-computer" aria-hidden="true">
                <svg viewBox="0 0 128 88" fill="none">
                  <rect x="17" y="9" width="94" height="59" rx="7" stroke="currentColor" strokeWidth="4" />
                  <path d="M27 20h74v37H27z" fill="#0b315a" fillOpacity=".56" />
                  <path d="m48 31-10 8 10 8m32-16 10 8-10 8m-8-12-8 9" stroke="#91d5ff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 74h112l-8 8H16l-8-8Z" fill="currentColor" />
                  <path d="M56 74h16l3 4H53l3-4Z" fill="#0b315a" />
                  <circle cx="101" cy="15" r="3" fill="#ffb02e" />
                </svg>
              </span>
            </Link>
          </div>
        </section>

        <section className="home-why-section">
          <div className="container">
            <div className="home-why-heading">
              <span className="home-section-kicker">چرا چکاد؟</span>
              <h2>انتخابی حرفه‌ای برای مسیر المپیاد</h2>
            </div>
            <div className="home-benefits-grid">
              <article className="home-benefit-card">
                <span className="home-benefit-icon home-benefit-orange"><BenefitIcon kind="target" /></span>
                <h3>آموزش هدفمند</h3>
                <p>برنامه‌ریزی علمی و متناسب با نیاز هر دانش‌آموز</p>
              </article>
              <article className="home-benefit-card">
                <span className="home-benefit-icon"><BenefitIcon kind="people" /></span>
                <h3>مدرسان و منتورهای باتجربه</h3>
                <p>انتخاب همراه آموزشی بر اساس نیاز و هدف دانش‌آموز</p>
              </article>
              <article className="home-benefit-card">
                <span className="home-benefit-icon"><BenefitIcon kind="progress" /></span>
                <h3>پیگیری پیشرفت</h3>
                <p>ارزیابی منظم، بازبینی برنامه و گزارش روند پیشرفت</p>
              </article>
              <article className="home-benefit-card">
                <span className="home-benefit-icon home-benefit-orange"><BenefitIcon kind="shield" /></span>
                <h3>انتخاب منتور مناسب</h3>
                <p>بررسی سوابق و تخصص افراد پیش از معرفی به دانش‌آموز</p>
              </article>
            </div>
          </div>
        </section>

        <section className="home-feature-section">
          <div className="container home-feature-layout">
            <div
              className="home-feature-image"
              role="img"
              aria-label="کتاب‌های فیزیک و علوم کامپیوتر و دفتر یادداشت روی میز مطالعه"
            />
            <div className="home-feature-copy">
              <span className="home-section-kicker">خدمات ما</span>
              <h2>دو مسیر، یک هدف: موفقیت در المپیاد</h2>
              <p>
                در چکاد، هم منتورینگ تخصصی و هم کلاس‌های خصوصی با توجه به نیاز و
                سطح دانش‌آموز ارائه می‌شوند تا مسیر یادگیری و پیشرفت روشن‌تر و
                منظم‌تر دنبال شود.
              </p>
              <div className="home-feature-actions">
                <Link href="/tutoring" className="button button-outline-orange">
                  مشاهده جزئیات کلاس خصوصی <Arrow />
                </Link>
                <Link href="/mentorship" className="button button-outline-blue">
                  مشاهده جزئیات منتورینگ <Arrow />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="home-process-section">
          <div className="container home-process-layout">
            <div className="home-process-intro">
              <span className="home-section-kicker">HOW IT WORKS</span>
              <h2>شروع همکاری،<br /><span>قدم‌به‌قدم و شفاف.</span></h2>
              <p>از ثبت درخواست تا انتخاب فرد مناسب، مسیر را روشن نگه می‌داریم تا دانش‌آموز و خانواده بدانند در هر مرحله چه اتفاقی می‌افتد.</p>
              <Link href="/mentorship" className="home-inline-link">آشنایی با فرایند منتورینگ <Arrow /></Link>
              <div className="home-process-aside">
                <span className="home-process-aside-icon" aria-hidden="true">↗</span>
                <div><strong>انتخاب نهایی با دانش‌آموز است</strong><p>پس از بررسی نیاز، گزینه‌های متناسب معرفی می‌شوند و فرصت انتخاب وجود دارد.</p></div>
              </div>
            </div>
            <div className="home-process-steps" aria-label="مراحل شروع همکاری">
              <div className="home-process-steps-heading">
                <div>
                  <span>مسیر همکاری</span>
                  <strong>از درخواست تا شروع همراهی</strong>
                </div>
                <span className="home-process-count">۴ مرحله ساده</span>
              </div>
              <div className="home-process-timeline">
                {processSteps.map((step, index) => (
                  <article className="home-process-step" key={step.number}>
                    <div className="home-process-step-index">
                      <span>{step.number}</span>
                      {index < processSteps.length - 1 ? <i /> : null}
                    </div>
                    <div className="home-process-step-content">
                      <div className="home-process-step-heading">
                        <h3>{step.title}</h3>
                        <span>مرحله {step.number}</span>
                      </div>
                      <p>{step.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="home-people-section">
          <div className="container">
            <div className="home-section-heading home-section-heading-light">
              <div>
                <span className="home-section-kicker">PEOPLE & EXPERIENCE</span>
                <h2>آدم‌های باتجربه،<br />کنار مسیر تو.</h2>
              </div>
              <div className="home-people-intro">
                <p>منتور و مدرس باید متناسب با نیاز دانش‌آموز انتخاب شوند. پروفایل‌های عمومی چکاد از اطلاعات ثبت‌شده در سامانه دریافت می‌شوند.</p>
                <Link href="/mentorship" className="home-inline-link home-inline-link-light">آشنایی با منتورینگ <Arrow /></Link>
              </div>
            </div>
            <RemotePeople kind="mentors" />
            <p className="home-people-disclaimer">سوابق و اطلاعات افراد فقط پس از بررسی و انتشار در پروفایل عمومی نمایش داده می‌شود.</p>
          </div>
        </section>

        <section className="home-faq-section">
          <div className="container home-faq-layout">
            <div className="home-faq-intro">
              <span className="home-section-kicker">FAQ</span>
              <h2>قبل از شروع،<br /><span>هر سؤالی داری بپرس.</span></h2>
              <p>اگر درباره خدمات، انتخاب منتور یا مراحل درخواست ابهامی داری، پاسخ پرسش‌های پرتکرار را اینجا پیدا کن.</p>
              <Link href="/contact" className="home-inline-link">ارتباط با چکاد <Arrow /></Link>
            </div>
            <div className="home-faq-list">
              {faqs.map((item) => (
                <details className="home-faq-item" key={item.question}>
                  <summary><strong>{item.question}</strong><i aria-hidden="true">+</i></summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="home-final-cta">
          <div className="container">
            <div className="home-final-cta-inner">
              <div className="home-final-cta-art" aria-hidden="true">چ</div>
              <div className="home-final-cta-copy">
                <span className="home-section-kicker">YOUR NEXT STEP</span>
                <h2>قدم بعدی مسیرت را<br />با شناخت انتخاب کن.</h2>
                <p>نیازت را مشخص کن؛ از منتورینگ یا کلاس خصوصی متناسب با مسیر المپیادت شروع کن.</p>
              </div>
              <div className="home-final-cta-actions">
                <Link href="/mentorship/apply" className="button button-light button-large">درخواست منتورینگ <Arrow /></Link>
                <Link href="/tutoring#request" className="home-final-text-link">درخواست کلاس خصوصی</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </CmsPageOverride>
  );
}
