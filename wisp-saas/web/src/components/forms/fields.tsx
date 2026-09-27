import clsx from "clsx";

export const inputClass =
  "h-12 w-full rounded-2xl bg-white px-4 text-[15px] font-semibold shadow-soft outline-none placeholder:font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-blue-300";

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={clsx("flex flex-col gap-1.5", className)}>
      <span className="px-1 text-xs font-bold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function ErrorLine({ error, hint }: { error?: string | null; hint?: string | null }) {
  if (!error) return null;
  return (
    <div role="alert" className="flex flex-col gap-0.5 rounded-2xl bg-red-50 px-4 py-2.5 text-[13px]">
      <span className="font-bold text-red-700">{error}</span>
      {hint && <span className="font-semibold text-red-600/80">{hint}</span>}
    </div>
  );
}

export const primaryClass =
  "flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-brand hover:bg-blue-700 disabled:opacity-60";
export const secondaryClass =
  "flex h-11 items-center justify-center gap-2 rounded-[14px] bg-white px-4 text-[13px] font-bold text-slate-700 shadow-soft hover:bg-slate-50 disabled:opacity-60";
