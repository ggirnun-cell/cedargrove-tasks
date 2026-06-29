// Centralized, validated access to environment variables.
//
// `requireEnv` throws a clear error the moment a missing var is actually needed
// (at runtime), rather than failing deep inside a library with a cryptic
// message. It deliberately does NOT run at import time, so `next build` — which
// has no database — never trips over a missing DATABASE_URL.

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in .env.local for local development or in the Render dashboard for deploys. See .env.example.`,
    );
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === "" ? undefined : value;
}
