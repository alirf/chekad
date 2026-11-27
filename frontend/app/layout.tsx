import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";

const vazirmatn = Vazirmatn({ subsets: ["arabic", "latin"], display: "swap" });

export const metadata: Metadata = {
  title: "چکاد | خدمات المپیاد",
  description: "منتورینگ و تدریس خصوصی المپیاد فیزیک و کامپیوتر"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.className}>
      <body className="min-h-screen bg-white text-slate-900">{children}</body>
    </html>
  );
}