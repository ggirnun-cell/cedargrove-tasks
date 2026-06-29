import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cedar Grove · Task Tracker",
  description: "Internal staff task tracker for Cedar Grove Capital and Covenant Property Services.",
  robots: { index: false, follow: false }, // internal, staff-only — keep out of search engines.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
