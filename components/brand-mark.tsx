"use client";

import { useState } from "react";

// Renders the Cedar Grove logo from /public, falling back to a text wordmark
// until the asset is added (CLAUDE.md §9 — Geoff drops cedar-grove-logo.svg or
// .png into public/; we do not invent a logo). Tries SVG then PNG, then text,
// so the header always looks intentional regardless of which file exists.
const SOURCES = ["/cedar-grove-logo.png"];

export function BrandMark({ className = "h-8 w-auto" }: { className?: string }) {
  const [index, setIndex] = useState(0);

  if (index >= SOURCES.length) {
    return <span className="text-lg font-bold tracking-tight">Cedar Grove</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- logo dimensions are unknown until the asset lands; plain img keeps the error-fallback simple.
    <img
      src={SOURCES[index]}
      alt="Cedar Grove"
      className={className}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
