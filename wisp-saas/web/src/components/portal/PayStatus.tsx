"use client";

import clsx from "clsx";
import { ArrowLeft, Check, Smartphone, Wifi } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCountdown, formatKsh } from "@/lib/format";

const RESEND_AFTER = 30;

function prettyPhone(msisdn: string) {
  const local = "0" + msisdn.slice(3);
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

export function PayStatus({
  tenantName,
  packageId,
  packageLabel,
  price,
  msisdn,
}: {
  tenantName: string;
  packageId: string;
  packageLabel: string;
  price: number;
  msisdn: string;
}) {
  const [wait, setWait] = useState(RESEND_AFTER);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const steps = [
    { label: "Sent", state: "done" as const },
    { label: "PIN", state: "current" as const },
    { label: "Online", state: "todo" as const },
  ];

  return (
    <>
      <header className="flex h-16 items-center gap-2 px-3">
        <Link href="/portal" aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-soft">
          <ArrowLeft aria-hidden size={20} strokeWidth={2.2} />
        </Link>
        <span className="mx-auto text-base font-extrabold">{tenantName}</span>
        <span className="w-11" />
      </header>

      <main className="flex flex-grow flex-col items-center gap-7 px-5 pb-6 pt-5 text-center">
        <div className="relative mt-5 flex h-[200px] w-[200px] items-center justify-center">
          <span className="pulse-ring absolute inset-0 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="absolute inset-[22px] rounded-full bg-blue-100" />
          <span className="relative flex h-28 w-28 items-center justify-center rounded-full shadow-brand" style={{ background: "var(--accent)" }}>
            <Smartphone aria-hidden size={46} strokeWidth={1.8} className="text-white" />
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px] font-extrabold tracking-tight">Enter M-Pesa PIN</h1>
          <span className="text-[15px] font-semibold text-slate-500">{prettyPhone(msisdn)}</span>
        </div>

        <div className="flex items-center gap-2.5 rounded-full bg-white py-2 pl-4 pr-2 shadow-card">
          <span className="text-sm font-bold text-slate-700">{packageLabel}</span>
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-base font-extrabold" style={{ color: "var(--accent)" }}>
            {formatKsh(price)}
          </span>
        </div>

        <ol aria-label="Progress" className="flex w-full items-start">
          {steps.map((s, i) => (
            <li key={s.label} className="contents">
              {i > 0 && <span aria-hidden className={clsx("mt-4 h-[3px] w-9 shrink-0 rounded", s.state === "todo" ? "bg-slate-200" : "bg-green-600")} />}
              <span
                aria-current={s.state === "current" ? "step" : undefined}
                className={clsx(
                  "flex flex-1 flex-col items-center gap-2 text-xs",
                  s.state === "done" && "font-bold text-green-600",
                  s.state === "current" && "font-extrabold",
                  s.state === "todo" && "font-bold text-slate-400",
                )}
                style={s.state === "current" ? { color: "var(--accent)" } : undefined}
              >
                {s.state === "done" && (
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-green-600">
                    <Check aria-hidden size={16} strokeWidth={3.2} className="text-white" />
                  </span>
                )}
                {s.state === "current" && (
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[3px] bg-white" style={{ borderColor: "var(--accent)" }}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--accent)" }} />
                  </span>
                )}
                {s.state === "todo" && (
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-slate-200">
                    <Wifi aria-hidden size={16} strokeWidth={2.4} className="text-slate-400" />
                  </span>
                )}
                {s.label}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-auto flex w-full flex-col items-center gap-3">
          <button
            type="button"
            disabled={wait > 0}
            onClick={() => setWait(RESEND_AFTER)}
            className="h-14 w-full rounded-[18px] bg-white text-[15px] font-bold shadow-card disabled:text-slate-400"
            style={wait > 0 ? undefined : { color: "var(--accent)" }}
          >
            {wait > 0 ? `Resend in ${formatCountdown(wait)}` : "Resend prompt"}
          </button>
          <Link href="/portal/reconnect" className="text-sm font-bold" style={{ color: "var(--accent)" }}>
            Have an M-Pesa code?
          </Link>
          {process.env.NODE_ENV !== "production" && (
            <Link href={`/portal/online?pkg=${packageId}`} className="text-[11px] text-slate-400 underline">
              Dev: simulate payment
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
