import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { getOnboarding } from "@/lib/api";

export const metadata = { title: "Add router · Mtandao" };

function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-extrabold text-blue-600">{n}</span>
      <div className="flex min-w-0 flex-grow flex-col gap-2.5">
        <h2 className="pt-1 text-base font-bold">{title}</h2>
        {children}
      </div>
    </li>
  );
}

export default async function AddRouterPage() {
  const ob = await getOnboarding();
  return (
    <>
      <header className="flex flex-wrap items-center gap-3.5">
        <Link href="/network" aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-soft">
          <ArrowLeft aria-hidden size={20} strokeWidth={2.2} />
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">Add router</h1>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-600">{ob.location}</span>
        <span className="ml-auto text-xs font-bold text-slate-500">RouterOS 7.1+</span>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-5">
        <section aria-label="Setup steps" className="rounded-card bg-white p-5 shadow-card lg:p-6">
          <ol className="flex flex-col gap-6">
            <Step n={1} title="Open terminal" />
            <Step n={2} title="Paste & press Enter">
              <pre className="whitespace-pre-wrap break-all rounded-[18px] bg-slate-900 p-4 font-mono text-[12.5px] leading-relaxed text-blue-100">{ob.command}</pre>
              <div className="flex items-center gap-3">
                <CopyButton
                  text={ob.command}
                  label="Copy command"
                  showLabel
                  className="h-11 rounded-full bg-blue-600 px-5 text-sm font-bold text-white shadow-brand hover:bg-blue-700"
                />
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">Valid 24h</span>
              </div>
            </Step>
            <Step n={3} title="Setting up">
              <pre className="whitespace-pre-wrap rounded-[18px] bg-slate-50 px-4 py-3.5 font-mono text-xs leading-7 text-slate-800">{ob.log.join("\n")}</pre>
            </Step>
          </ol>
        </section>

        <section aria-label="Connection status" className="overflow-hidden rounded-card bg-white shadow-card">
          <div className="flex items-center gap-3.5 bg-gradient-to-br from-green-50 to-white p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-600 shadow-[0_8px_18px_rgba(22,163,74,0.3)]">
              <Check aria-hidden size={24} strokeWidth={3} className="text-white" />
            </span>
            <div className="flex flex-col">
              <span className="text-[22px] font-extrabold tracking-tight text-green-900">Router connected!</span>
              <span className="text-[13px] font-semibold text-green-700">{ob.router}</span>
            </div>
          </div>
          <ul className="px-5 pb-3 pt-1.5">
            {ob.checks.map((c) => (
              <li key={c.label} className="flex items-center gap-3 border-t border-line py-2.5">
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check aria-hidden size={12} strokeWidth={3.4} className="text-green-700" />
                </span>
                <span className="flex-grow text-sm font-semibold">{c.label}</span>
                <span className="font-mono text-xs text-slate-500">{c.detail}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2.5 px-5 pb-5 pt-1">
            <Link href="/" className="flex h-12 flex-grow items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-brand hover:bg-blue-700">
              Done
            </Link>
            <Link href="/portal" className="flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">
              Preview portal
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
