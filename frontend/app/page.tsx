import type { Metadata } from "next";
import Link from "next/link";
import { CmsPageOverride } from "../components/cms-page-override";
import { HomeServiceFinder } from "../components/home-service-finder";
import { RemotePeople } from "../components/remote-people";

export const metadata: Metadata = {
  title: "چکاد | منتورینگ و کلاس خصوصی المپیاد فیزیک و کامپیوتر",
  description:
    "چکاد؛ همراه تخصصی دانش‌آموزان المپیاد فیزیک و کامپیوتر با خدمات منتورینگ، برنامه‌ریزی، پیگیری مسیر و کلاس خصوصی تخصصی.",
  openGraph: {
    title: "چکاد | مسیر المپیاد را آگاهانه پیش ببر",
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

export default function Home() {
  return (
    <CmsPageOverride slug="home">
      <main id="main-content" className="home-page">
        <section className="home-hero">
          <div className="home-hero-glow home-hero-glow-one" aria-hidden="true" />
          <div className="home-hero-glow home-hero-glow-two" aria-hidden="true" />
          <div className="container home-hero-grid">
            <div className="home-hero-copy">
              <div className="home-eyebrow">
                <span className="home-eyebrow-dot" />
                مؤسسه تخصصی المپیاد فیزیک و کامپیوتر
              </div>
              <h1>
                مسیر المپیاد،
                <br />
                <span>با فکر روشن‌تر</span>
                <br />
                و قدم‌های دقیق‌تر.
              </h1>
              <p className="home-hero-description">
                برای پیشرفت در المپیاد، فقط منابع بیشتر لازم نیست؛ شناخت مسیر،
                همراهی درست و تمرین هدفمند هم اهمیت دارد. چکاد برای همین بخش از
                مسیر کنار دانش‌آموز است.
              </p>
              <div className="home-hero-actions">
                <Link href="/mentorship/apply" className="button button-primary button-large">
                  شروع با منتورینگ <Arrow />
                </Link>
                <Link href="/tutoring" className="button button-secondary button-large">
                  آشنایی با کلاس خصوصی
                </Link>
              </div>
              <div className="home-hero-proof" aria-label="حوزه‌های فعالیت چکاد">
                <span><i className="home-proof-dot home-proof-dot-orange" /> فیزیک</span>
                <span><i className="home-proof-dot home-proof-dot-teal" /> کامپیوتر</span>
                <span className="home-proof-separator" />
                <span className="home-proof-note">تمرکز تخصصی، نه محتوای پراکنده</span>
              </div>
            </div>

            <div className="home-hero-visual">
              <div className="home-art-orbit home-art-orbit-one" />
              <div className="home-art-orbit home-art-orbit-two" />
              <div className="home-art-tag home-art-tag-top">CHEKAD / OLYMPIAD PATH</div>
              <div className="home-mountain-art" aria-hidden="true">
                <svg viewBox="0 0 620 470" role="presentation">
                  <defs>
                    <linearGradient id="homeMountain" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0" stopColor="#284d78" />
                      <stop offset="1" stopColor="#102744" />
                    </linearGradient>
                    <linearGradient id="homeTrail" x1="0" x2="1" y1="1" y2="0">
                      <stop offset="0" stopColor="#e99a37" />
                      <stop offset="1" stopColor="#ffc15a" />
                    </linearGradient>
                  </defs>
                  <circle cx="430" cy="111" r="72" fill="#f3ad45" opacity=".18" />
                  <circle cx="430" cy="111" r="48" fill="#f3ad45" opacity=".22" />
                  <path d="M66 386 228 198l59 56 105-148 69 94 52-56 58 76 41 166Z" fill="url(#homeMountain)" />
                  <path d="m228 198 59 56 105-148 69 94-77-34-48-53-77 115Z" fill="#315b88" opacity=".75" />
                  <path d="m105 366 134-126 43 26 111-138" fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M111 366c108-10 164-37 214-80 46-40 70-79 103-155" fill="none" stroke="url(#homeTrail)" strokeWidth="13" strokeLinecap="round" />
                  <path d="M428 111 410 77l21-18 25 18-12 34Z" fill="#fff" opacity=".95" />
                  <path d="M393 61 434 39l43 22-43 22Z" fill="#102744" />
                  <path d="M413 76v30M455 76v30" stroke="#102744" strokeWidth="5" strokeLinecap="round" />
                  <path d="M455 106c0 11-14 11-14 0 0-8 7-14 7-14s7 6 7 14Z" fill="#102744" />
                  <circle cx="111" cy="366" r="10" fill="#e99a37" stroke="#fff" strokeWidth="5" />
                  <circle cx="428" cy="111" r="10" fill="#e99a37" stroke="#fff" strokeWidth="5" />
                  <path d="M82 411h456" stroke="#b8c6d6" strokeWidth="1.5" opacity=".6" />
                  <path d="M120 411v10M500 411v10" stroke="#b8c6d6" strokeWidth="1.5" opacity=".6" />
                  <text x="84" y="436" fill="#6c829c" fontSize="12" fontFamily="monospace">START</text>
                  <text x="493" y="436" fill="#6c829c" fontSize="12" fontFamily="monospace">NEXT</text>
                </svg>
              </div>
              <div className="home-art-label home-art-label-left">
                <span>01</span><strong>شناخت مسیر</strong>
              </div>
              <div className="home-art-label home-art-label-right">
                <span>02</span><strong>حرکت هدفمند</strong>
              </div>
              <div className="home-hero-card">
                <div className="home-hero-card-mark">C.</div>
                <div>
                  <strong>هر مسیر، نقطه شروع خودش را دارد.</strong>
                  <span>با شناخت نیازت، قدم بعدی را انتخاب کن.</span>
                </div>
                <span className="home-hero-card-arrow" aria-hidden="true">↙</span>
              </div>
            </div>
          </div>
          <div className="home-hero-bottom">
            <div className="container home-hero-bottom-inner">
              <span>PHYSICS OLYMPIAD</span>
              <i />
              <span>COMPUTER SCIENCE</span>
              <i />
              <span>PERSONAL GUIDANCE</span>
              <b>CHEKAD</b>
            </div>
          </div>
        </section>

        <section className="home-start-section" aria-label="انتخاب خدمت">
          <div className="container home-start-layout">
            <div className="home-start-copy">
              <span className="home-section-kicker">از همین‌جا شروع کن</span>
              <h2>اول نیازت را بشناس؛<br /><span>بعد مسیر مناسب را انتخاب کن.</span></h2>
              <p>منتورینگ و کلاس خصوصی دو خدمت متفاوت‌اند. انتخاب درست کمک می‌کند از ابتدا بدانی چه نوع همراهی برایت مناسب‌تر است.</p>
              <div className="home-start-links">
                <Link href="/mentorship">منتورینگ چیست؟ <Arrow /></Link>
                <Link href="/tutoring">کلاس خصوصی چیست؟ <Arrow /></Link>
              </div>
            </div>
            <HomeServiceFinder />
          </div>
        </section>

        <section className="home-services-section">
          <div className="container">
            <div className="home-section-heading">
              <div>
                <span className="home-section-kicker">خدمات اصلی چکاد</span>
                <h2>دو نیاز متفاوت؛<br /><span>دو راهکار تخصصی.</span></h2>
              </div>
              <p>به‌جای ارائه یک نسخه یکسان برای همه، نوع خدمت را بر اساس مسئله‌ای که می‌خواهی حل کنی انتخاب کن.</p>
            </div>
            <div className="home-service-grid">
              <article className="home-service-card home-service-mentorship">
                <div className="home-service-card-top">
                  <span className="home-service-number">01 / GUIDANCE</span>
                  <span className="home-service-icon" aria-hidden="true">⌁</span>
                </div>
                <div className="home-service-art home-service-art-path" aria-hidden="true">
                  <svg viewBox="0 0 300 135" role="presentation">
                    <path d="M15 111C75 111 73 79 126 79s54-51 108-51h48" fill="none" stroke="#2d5a89" strokeWidth="3" strokeDasharray="5 8" />
                    <path d="M15 111C75 111 73 79 126 79s54-51 108-51h48" fill="none" stroke="#e9a03b" strokeWidth="8" strokeLinecap="round" strokeDasharray="1 1000" />
                    <circle cx="15" cy="111" r="8" fill="#e9a03b" />
                    <circle cx="126" cy="79" r="8" fill="#1d496f" stroke="#fff" strokeWidth="4" />
                    <circle cx="282" cy="28" r="8" fill="#1d496f" stroke="#fff" strokeWidth="4" />
                    <path d="M253 18h29V47" fill="none" stroke="#1d496f" strokeWidth="2" opacity=".45" />
                  </svg>
                </div>
                <span className="home-service-eyebrow">MENTORSHIP</span>
                <h3>منتورینگ و همراهی مسیر</h3>
                <p>برای وقتی که می‌خواهی مسیر المپیاد را منظم‌تر پیش ببری، اولویت‌ها را بشناسی و روند پیشرفتت را پیگیری کنی.</p>
                <ul>
                  <li>شناخت وضعیت و هدف فعلی</li>
                  <li>برنامه‌ریزی متناسب با شرایط</li>
                  <li>گفت‌وگو و پیگیری مسیر</li>
                </ul>
                <Link href="/mentorship" className="home-service-link">جزئیات منتورینگ <Arrow /></Link>
              </article>

              <article className="home-service-card home-service-tutoring">
                <div className="home-service-card-top">
                  <span className="home-service-number">02 / DEEP LEARNING</span>
                  <span className="home-service-icon" aria-hidden="true">∑</span>
                </div>
                <div className="home-service-art home-service-art-equation" aria-hidden="true">
                  <svg viewBox="0 0 300 135" role="presentation">
                    <path d="M37 24h54M37 24v89M37 113h54M116 29h32l-29 37 29 37h-32M180 24h79M180 68h58M180 112h79" fill="none" stroke="#1d496f" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="272" cy="24" r="8" fill="#e9a03b" />
                    <circle cx="259" cy="112" r="8" fill="#e9a03b" />
                  </svg>
                </div>
                <span className="home-service-eyebrow">PRIVATE TUTORING</span>
                <h3>کلاس خصوصی تخصصی</h3>
                <p>برای وقتی که می‌خواهی یک مبحث را عمیق‌تر یاد بگیری، راه‌حل‌ها را بررسی کنی یا در موضوعی مشخص رفع اشکال داشته باشی.</p>
                <ul>
                  <li>آموزش مباحث فیزیک و کامپیوتر</li>
                  <li>حل تمرین و بررسی راه‌حل‌ها</li>
                  <li>تناسب مدرس با نیاز علمی</li>
                </ul>
                <Link href="/tutoring" className="home-service-link">جزئیات کلاس خصوصی <Arrow /></Link>
              </article>
            </div>
            <div className="home-service-note">
              <span aria-hidden="true">i</span>
              <p><strong>یک نکته مهم:</strong> منتورینگ جای کلاس خصوصی را نمی‌گیرد و کلاس خصوصی هم جای همراهی بلندمدت را. هر دو خدمت می‌توانند مستقل و بر اساس نیاز دانش‌آموز انتخاب شوند.</p>
            </div>
          </div>
        </section>

        <section className="home-olympiads-section">
          <div className="container">
            <div className="home-section-heading home-section-heading-light">
              <div>
                <span className="home-section-kicker">دو حوزه تخصصی</span>
                <h2>هر رشته، منطق خودش را دارد.</h2>
              </div>
              <p>چکاد در فاز فعلی روی دو مسیر متمرکز است تا خدمات و همراهی، متناسب با ویژگی‌های هر المپیاد شکل بگیرد.</p>
            </div>
            <div className="home-olympiad-grid">
              <Link href="/olympiads/physics" className="home-olympiad-card home-olympiad-physics">
                <div className="home-olympiad-symbol" aria-hidden="true">
                  <svg viewBox="0 0 150 150" role="presentation">
                    <circle cx="75" cy="75" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
                    <ellipse cx="75" cy="75" rx="66" ry="25" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(-32 75 75)" />
                    <ellipse cx="75" cy="75" rx="66" ry="25" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(32 75 75)" />
                    <circle cx="75" cy="75" r="5" fill="#e9a03b" />
                  </svg>
                </div>
                <span>PHYSICS OLYMPIAD</span>
                <h3>المپیاد فیزیک</h3>
                <p>فهم مفهومی، مدل‌سازی و استدلال برای رسیدن به راه‌حل.</p>
                <b>شناخت مسیر فیزیک <Arrow /></b>
              </Link>
              <Link href="/olympiads/computer" className="home-olympiad-card home-olympiad-computer">
                <div className="home-olympiad-symbol" aria-hidden="true">
                  <svg viewBox="0 0 150 150" role="presentation">
                    <rect x="22" y="22" width="106" height="106" rx="20" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M44 52h24M44 75h14M44 98h31M82 52h24M82 75h15M82 98h24" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="113" cy="112" r="5" fill="#e9a03b" />
                  </svg>
                </div>
                <span>COMPUTER SCIENCE OLYMPIAD</span>
                <h3>المپیاد کامپیوتر</h3>
                <p>تفکر الگوریتمی، تجزیه مسئله و تحلیل راه‌حل.</p>
                <b>شناخت مسیر کامپیوتر <Arrow /></b>
              </Link>
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
            <div className="home-process-steps">
              {processSteps.map((step, index) => (
                <article className="home-process-step" key={step.number}>
                  <div className="home-process-step-index"><span>{step.number}</span>{index < processSteps.length - 1 ? <i /> : null}</div>
                  <div><h3>{step.title}</h3><p>{step.text}</p></div>
                </article>
              ))}
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
              {faqs.map((item, index) => (
                <details className="home-faq-item" key={item.question}>
                  <summary><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.question}</strong><i aria-hidden="true">+</i></summary>
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
