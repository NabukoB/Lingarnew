"use client";

import { cn } from "@/lib/utils";
import { AlertCircle, ArrowLeft, Check, Smartphone, Wifi } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatCountdown, formatKsh } from "@/lib/format";
import { buyPackage, purchaseStatus } from "@/lib/portal-actions";

const RESEND_AFTER = 30;

function prettyPhone(msisdn: string) {
  const local = "0" + msisdn.slice(3);
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

export function PayStatus({
  tenantName,
  purchaseId,
  packageId,
  packageLabel,
  price,
  msisdn,
}: {
  tenantName: string;
  purchaseId: string;
  packageId: string;
  packageLabel: string;
  price: number;
  msisdn: string;
}) {
  const router = useRouter();
  const [wait, setWait] = useState(RESEND_AFTER);
  const [id, setId] = useState(purchaseId);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  // Poll the purchase until Safaricom's callback (or the STK query) settles it.
  useEffect(() => {
    if (error || paid) return;
    let stop = false;
    const tick = async () => {
      const r = await purchaseStatus(id);
      if (stop) return;
      if (!r.ok) return;
      if (r.data.state === "active") {
        setPaid(true);
        window.location.href = r.data.next ?? `/portal/online?p=${encodeURIComponent(id)}`;
      } else if (r.data.state === "failed" || r.data.state === "expired") {
        setError(r.data.message || "Payment didn't go through. Try again.");
        setWait(0);
      }
    };
    const t = setInterval(tick, 3000);
    void tick();
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [id, error, paid]);

  async function resend() {
    setError(null);
    setWait(RESEND_AFTER);
    const r = await buyPackage(packageId, msisdn);
    if (r.ok) {
      setId(r.data.purchaseId);
      router.replace(`/portal/pay?p=${encodeURIComponent(r.data.purchaseId)}&pkg=${packageId}&phone=${msisdn}`);
    } else {
      setError(r.error);
    }
  }

  const steps = [
    { label: "Sent", state: "done" as const },
    { label: "PIN", state: paid ? ("done" as const) : ("current" as const) },
    { label: "Online", state: paid ? ("current" as const) : ("todo" as const) },
  ];

  return (
    <>
      <header className="flex h-16 items-center gap-2 px-3">
        <Link href="/portal" aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full bg-card shadow-soft">
          <ArrowLeft aria-hidden size={20} strokeWidth={2.2} />
        </Link>
        <span className="mx-auto text-base font-extrabold">{tenantName}</span>
        <span className="w-11" />
      </header>

      <main className="flex flex-grow flex-col items-center gap-7 px-5 pb-6 pt-5 text-center">
        <div className="relative mt-5 flex h-[200px] w-[200px] items-center justify-center">
          <span className="animate-pulse-ring absolute inset-0 rounded-full" style={{ background: "var(--brand)" }} />
          <span className="absolute inset-[22px] rounded-full bg-blue-100" />
          <span className="relative flex h-28 w-28 items-center justify-center rounded-full shadow-brand" style={{ background: "var(--brand)" }}>
            <Smartphone aria-hidden size={46} strokeWidth={1.8} className="text-white" />
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px] font-extrabold tracking-tight">{paid ? "Connecting…" : "Enter M-Pesa PIN"}</h1>
          <span className="text-[15px] font-semibold text-muted-foreground">{prettyPhone(msisdn)}</span>
        </div>

        <div className="flex items-center gap-2.5 rounded-full bg-white py-2 pl-4 pr-2 shadow-card">
          <span className="text-sm font-bold text-slate-700">{packageLabel}</span>
          <span className="rounded-full bg-accent px-3 py-1.5 text-base font-extrabold" style={{ color: "var(--brand)" }}>
            {formatKsh(price)}
          </span>
        </div>

        <ol aria-label="Progress" className="flex w-full items-start">
          {steps.map((s, i) => (
            <li key={s.label} className="contents">
              {i > 0 && <span aria-hidden className={cn("mt-4 h-[3px] w-9 shrink-0 rounded", s.state === "todo" ? "bg-muted" : "bg-green-600")} />}
              <span
                aria-current={s.state === "current" ? "step" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-2 text-xs",
                  s.state === "done" && "font-bold text-green-600",
                  s.state === "current" && "font-extrabold",
                  s.state === "todo" && "font-bold text-muted-foreground/80",
                )}
                style={s.state === "current" ? { color: "var(--brand)" } : undefined}
              >
                {s.state === "done" && (
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-green-600">
                    <Check aria-hidden size={16} strokeWidth={3.2} className="text-white" />
                  </span>
                )}
                {s.state === "current" && (
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[3px] bg-white" style={{ borderColor: "var(--brand)" }}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--brand)" }} />
                  </span>
                )}
                {s.state === "todo" && (
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-muted">
                    <Wifi aria-hidden size={16} strokeWidth={2.4} className="text-muted-foreground/80" />
                  </span>
                )}
                {s.label}
              </span>
            </li>
          ))}
        </ol>

        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-full bg-red-100 px-3 py-2 text-[13px] font-bold text-red-700">
            <AlertCircle aria-hidden size={15} strokeWidth={2.4} />
            {error}
          </div>
        )}

        <div className="mt-auto flex w-full flex-col items-center gap-3">
          <button
            type="button"
            disabled={wait > 0 || paid}
            onClick={resend}
            className="h-14 w-full rounded-[18px] bg-white text-[15px] font-bold shadow-card disabled:text-muted-foreground/80"
            style={wait > 0 ? undefined : { color: "var(--brand)" }}
          >
            {wait > 0 ? `Resend in ${formatCountdown(wait)}` : "Resend prompt"}
          </button>
          <Link href="/portal/reconnect" className="text-sm font-bold" style={{ color: "var(--brand)" }}>
            Have an M-Pesa code?
          </Link>
          {id.startsWith("demo-") && (
            <Link href={`/portal/online?pkg=${packageId}`} className="text-[11px] text-muted-foreground/80 underline">
              Dev: simulate payment
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
