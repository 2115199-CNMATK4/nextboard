import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NextBoard — Realtime Collaborative Whiteboard",
  description:
    "Bảng trắng cộng tác thời gian thực: text, hình khối, đường thẳng, mũi tên, nét vẽ tự do. Realtime broadcast và presence qua Supabase.",
};

// Inline script — runs before first paint to set `.dark` class on <html>
// based on stored theme preference. Avoids FOUC. Must be string literal in
// dangerouslySetInnerHTML so Next.js doesn't try to bundle it.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('nextboard.theme.v1');if(t!=='light'&&t!=='dark'&&t!=='system')t='system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
