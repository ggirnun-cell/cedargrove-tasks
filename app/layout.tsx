import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
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
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" afterSignOutUrl="/sign-in">
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
