import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import "../globals.css";

export const metadata: Metadata = {
  title: "일본 쇼핑 실속 계산기",
  robots: { index: false },
};

export default function RootRedirectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body>{children}</body>
    </html>
  );
}
