export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold">چکاد</h1>
      <p className="mt-4 text-slate-600">
        پلتفرم خدمات المپیاد — نسخه اولیه در حال راه‌اندازی.
      </p>
      <ul className="mt-8 space-y-2 text-sm text-slate-500">
        <li>✔ ساختار میکروسرویس و Gateway فعال است</li>
        <li>✔ RTL و فونت فارسی اعمال شده</li>
        <li>⏳ فرم‌ها و پنل مدیریت در قدم بعدی</li>
      </ul>
    </main>
  );
}