"use client";

import Link from "next/link";
import { useState } from "react";

type Service = "mentorship" | "tutoring";

const serviceInfo: Record<Service, { title: string; description: string; href: string; action: string }> = {
  mentorship: {
    title: "منتورینگ و همراهی مسیر",
    description: "برای برنامه‌ریزی، انتخاب اولویت‌ها و پیگیری منظم مسیر المپیاد.",
    href: "/mentorship/apply",
    action: "درخواست منتورینگ",
  },
  tutoring: {
    title: "کلاس خصوصی تخصصی",
    description: "برای یادگیری عمیق یک مبحث، حل تمرین و رفع اشکال علمی.",
    href: "/tutoring#request",
    action: "درخواست کلاس خصوصی",
  },
};

export function HomeServiceFinder() {
  const [service, setService] = useState<Service>("mentorship");
  const selected = serviceInfo[service];

  return (
    <section className="home-finder" aria-labelledby="home-finder-title">
      <div className="home-finder-heading">
        <span className="home-finder-step">شروع مسیر</span>
        <span className="home-finder-mark" aria-hidden="true">↙</span>
      </div>
      <h2 id="home-finder-title">الان به چه نوع همراهی نیاز داری؟</h2>
      <p className="home-finder-intro">خدمت متناسب با نیازت را انتخاب کن؛ جزئیات و مراحل بعدی را در صفحه اختصاصی ببین.</p>
      <div className="home-finder-options" role="group" aria-label="انتخاب نوع خدمت">
        <button
          type="button"
          className={service === "mentorship" ? "home-finder-option is-active" : "home-finder-option"}
          aria-pressed={service === "mentorship"}
          onClick={() => setService("mentorship")}
        >
          <span className="home-finder-option-icon" aria-hidden="true">⌁</span>
          <span><strong>منتورینگ</strong><small>برنامه‌ریزی و پیگیری</small></span>
          <span className="home-finder-radio" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={service === "tutoring" ? "home-finder-option is-active" : "home-finder-option"}
          aria-pressed={service === "tutoring"}
          onClick={() => setService("tutoring")}
        >
          <span className="home-finder-option-icon" aria-hidden="true">∑</span>
          <span><strong>کلاس خصوصی</strong><small>آموزش و رفع اشکال</small></span>
          <span className="home-finder-radio" aria-hidden="true" />
        </button>
      </div>
      <div className="home-finder-summary" aria-live="polite">
        <p>{selected.description}</p>
        <Link href={selected.href} className="button button-primary home-finder-cta">
          {selected.action}<span aria-hidden="true">←</span>
        </Link>
      </div>
      <p className="home-finder-footnote">چکاد در حال حاضر بر المپیاد فیزیک و المپیاد کامپیوتر تمرکز دارد.</p>
    </section>
  );
}
