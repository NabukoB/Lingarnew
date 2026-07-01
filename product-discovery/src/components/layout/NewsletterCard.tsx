"use client";

import { useState } from "react";

export function NewsletterCard() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  }

  return (
    <section className="mx-auto max-w-[1240px] px-5 py-14">
      <div className="rounded-card border border-hairline bg-surface p-10 shadow-card md:p-14">
        <div className="mx-auto max-w-lg text-center">
          <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-[.16em] text-ink-400">
            Stay in the loop
          </p>
          <h2 className="mb-4 font-display text-[clamp(22px,3vw,30px)] font-bold text-ink-900">
            New makers, new finds — weekly
          </h2>
          <p className="mb-8 text-sm leading-relaxed text-ink-500">
            We surface a handful of new products and stories every week. No noise, just good things.
          </p>

          {submitted ? (
            <p className="rounded-full bg-primary-50 px-6 py-3 text-sm font-medium text-primary">
              You&rsquo;re in — check your inbox soon.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 rounded-full border border-hairline bg-white px-5 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
              <button
                type="submit"
                className="rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
