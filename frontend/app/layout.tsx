import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { StudentSessionProvider } from "../components/student-session-provider";

const vazirmatn = Vazirmatn({ subsets: ["arabic", "latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "چکاد | همراه تخصصی مسیر المپیاد",
    template: "%s | چکاد",
  },
  description:
    "چکاد همراه دانش‌آموزان المپیاد فیزیک و کامپیوتر است؛ از منتورینگ و تدریس خصوصی تا آزمون‌های تخصصی و محتوای هدفمند.",
  applicationName: "CHEKAD",
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: "چکاد",
    title: "چکاد | همراه تخصصی مسیر المپیاد",
    description:
      "مسیر المپیاد فیزیک و کامپیوتر را با همراهی آگاهانه، مشاوره تخصصی و آزمون‌های هدفمند پیش ببرید.",
  },
  twitter: {
    card: "summary_large_image",
    title: "چکاد | همراه تخصصی مسیر المپیاد",
    description: "منتورینگ، تدریس خصوصی و آزمون‌های تخصصی المپیاد فیزیک و کامپیوتر.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.className}>
      <body>
        <StudentSessionProvider>
          <a className="skip-link" href="#main-content">رفتن به محتوای اصلی</a>
          <SiteHeader />
          {children}
          <SiteFooter />
        </StudentSessionProvider>
      </body>
    </html>
  );
}
