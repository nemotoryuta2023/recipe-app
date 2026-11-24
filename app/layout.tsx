import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "動画レシピ帳",
  description: "料理動画のURLからレシピを作って、手持ちの材料で探せるアプリ",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "動画レシピ帳" },
};

export const viewport: Viewport = { themeColor: "#e8590c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="header">
          <Link href="/" className="brand">動画レシピ帳</Link>
          <nav className="nav">
            <Link href="/">取り込み</Link>
            <Link href="/recipes">レシピ</Link>
            <Link href="/match">おすすめ</Link>
          </nav>
        </header>
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
