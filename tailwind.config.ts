import type { Config } from "tailwindcss";

// Cedar Grove house palette (CLAUDE.md §9). Exposed as Tailwind colors so
// utility classes (bg-cg-green, text-cg-copper, …) stay on-brand without
// reaching for raw hex values. CSS variables of the same names live in
// app/globals.css for use outside Tailwind.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "cg-green": "#334E44",
        "cg-copper": "#B36629",
        "cg-cream": "#F3E4D2",
      },
      fontFamily: {
        // Clean system sans stack per §9 — Arial-first.
        sans: ["Arial", "Helvetica", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
