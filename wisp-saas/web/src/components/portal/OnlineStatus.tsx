"use client";

import { Check, Clock, Smartphone, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/format";
import { CopyButton } from "../CopyButton";
import { primaryButtonClass } from "./PrimaryButton";

const R = 108;
const C = 2 * Math.PI * R;

export function OnlineStatus({
  tenantName,
  totalMinutes,
  mbps,
  receipt,
  devicesUsed,
  maxDevices,
}: {
  tenantName: string;
  totalMinutes: number;
  mbps: number;
  receipt: string;
  devicesUsed: number;
  maxDevices: number;
}) {
  const total = totalMinutes * 60;
  const [left, setLeft] = useState(total - 90);
  const [endsAt, setEndsAt] = useState<string>("");

  useEffect(() => {
    const end = new Date(Date.now() + left * 1000);
    setEndsAt(end.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", hour12: false }));
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const offset = C * (1 - left / total);

  return (
    <>
      <header className="flex h-16 items-center justify-center gap-2">
        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-[15px] font-extrabold text-white" style={{ background: "var(--accent)" }}>
          {tenantName[0]}
        </span>
        <span className="text-base font-extrabold">{tenantName}</span>
      </header>

      <main className="flex flex-grow flex-col items-center gap-5 px-5 pb-6 pt-3">
        <span className="flex items-center gap-2 rounded-full bg-green-100 px-3.5 py-2 text-sm font-extrabold text-green-700">
          <Check aria-hidden size={16} strokeWidth={3} />
          You&apos;re online
        </span>

        <div className="relative h-[250px] w-[250px]">
          <svg viewBox="0 0 250 250" role="img" aria-label={`${formatCountdown(left)} left`} className="h-full w-full -rotate-90">
            <circle cx="125" cy="125" r={R} fill="none" stroke="#e2e8f0" strokeWidth={16} />
            <circle cx="125" cy="125" r={R} fill="none" stroke="var(--accent)" strokeWidth={16} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className="tabular text-[46px] font-extrabold tracking-tighter">{formatCountdown(left)}</span>
            <span className="text-[13px] font-bold uppercase tracking-widest text-slate-500">left</span>
          </div>
        </div>

        <div className="grid w-full grid-cols-3 gap-2.5">
          {[
            { icon: Clock, value: endsAt || "—", label: "Ends" },
            { icon: Smartphone, value: `${devicesUsed} / ${maxDevices}`, label: "Devices" },
            { icon: Zap, value: `${mbps} Mbps`, label: "Speed" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 shadow-card">
              <Icon aria-hidden size={18} strokeWidth={2.2} style={{ color: "var(--accent)" }} />
              <span className="text-[15px] font-extrabold">{value}</span>
              <span className="text-[11px] font-semibold text-slate-500">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex w-full items-center gap-2.5 rounded-2xl bg-white py-2 pl-4 pr-2 shadow-card">
          <span className="text-xs font-bold text-slate-500">M-Pesa code</span>
          <span className="tabular ml-auto text-base font-extrabold tracking-wider">{receipt}</span>
          <CopyButton text={receipt} label="Copy M-Pesa code" className="h-10 w-10 rounded-xl bg-blue-50 text-[var(--accent)]" />
        </div>

        <div className="mt-auto flex w-full flex-col items-center gap-3">
          <a href="https://www.google.com" className={primaryButtonClass} style={{ background: "var(--accent)" }}>
            Start browsing
          </a>
          <Link href="/portal/reconnect" className="text-sm font-bold" style={{ color: "var(--accent)" }}>
            + Add a device
          </Link>
        </div>
      </main>
    </>
  );
}
