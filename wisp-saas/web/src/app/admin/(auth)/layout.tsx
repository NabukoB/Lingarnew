import { ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/motion";

export const metadata = { title: "Admin · Mtandao", robots: { index: false, follow: false } };

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-start justify-center px-4 py-10 sm:items-center">
      <Reveal className="flex w-full max-w-[400px] flex-col gap-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <ShieldCheck aria-hidden size={20} strokeWidth={2.4} />
          </span>
          <span className="text-lg font-extrabold tracking-tight">Mtandao Admin</span>
        </div>
        <div className="rounded-card bg-card p-6 shadow-float">{children}</div>
      </Reveal>
    </div>
  );
}
