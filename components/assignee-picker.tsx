"use client";

import { useEffect, useState } from "react";

type Target = {
  label: string;
  recipientEmail: string | null;
  propertyId: string | null;
  jobFunction: string | null;
};
type Suggestion = Target & { kind: "role" | "person" };

const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());

// Type-ahead assignee picker (CLAUDE.md §6a). Adds one or more targets; each
// becomes its own task instance (fan-out). Selecting a role pre-fills its
// mailbox, which stays editable. The chosen targets are serialized into a hidden
// `targets` field the create form submits.
export function AssigneePicker() {
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (q.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/assignees?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        setOpen(true);
      } catch {
        /* aborted or offline — ignore */
      }
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [q]);

  const add = (t: Target) => {
    setTargets((prev) => [...prev, t]);
    setQ("");
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div>
      <span className="text-sm font-medium text-cg-green">Assignees</span>
      <p className="mb-2 text-xs text-cg-ink/60">
        Search a role mailbox or person, or type an email. Add more than one to send the same task
        to several places (each is tracked separately).
      </p>

      {targets.length > 0 && (
        <ul className="mb-2 space-y-2">
          {targets.map((t, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded border border-cg-green/20 bg-white px-3 py-2"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-cg-ink">{t.label}</div>
                <input
                  value={t.recipientEmail ?? ""}
                  onChange={(e) =>
                    setTargets((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, recipientEmail: e.target.value } : x)),
                    )
                  }
                  placeholder="email to ping (optional)"
                  className="mt-1 w-full rounded border border-cg-green/15 px-2 py-1 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => setTargets((prev) => prev.filter((_, j) => j !== i))}
                className="text-xs text-cg-ink/50 hover:text-cg-copper"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Type a name, role, property, or email…"
          className="w-full rounded border border-cg-green/25 px-3 py-2 text-sm"
        />
        {open && (suggestions.length > 0 || isEmail(q)) && (
          <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded border border-cg-green/20 bg-white shadow-lg">
            {isEmail(q) && (
              <li>
                <button
                  type="button"
                  onClick={() =>
                    add({ label: q.trim(), recipientEmail: q.trim(), propertyId: null, jobFunction: null })
                  }
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-cg-green/5"
                >
                  Use email “{q.trim()}”
                </button>
              </li>
            )}
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() =>
                    add({
                      label: s.label,
                      recipientEmail: s.recipientEmail,
                      propertyId: s.propertyId,
                      jobFunction: s.jobFunction,
                    })
                  }
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-cg-green/5"
                >
                  <span className="text-cg-ink">{s.label}</span>
                  {s.recipientEmail && (
                    <span className="ml-2 text-xs text-cg-ink/50">{s.recipientEmail}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <input type="hidden" name="targets" value={JSON.stringify(targets)} />
    </div>
  );
}
