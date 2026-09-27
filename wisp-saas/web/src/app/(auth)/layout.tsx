import { Logo } from "@/components/Logo";
import { Reveal } from "@/components/motion";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-hidden px-4 py-10 sm:items-center">
      <span aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-blue-400/20 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 h-[380px] w-[380px] rounded-full bg-sky-300/20 blur-3xl" />
      <Reveal className="relative flex w-full max-w-[420px] flex-col gap-6">
        <Logo />
        <div className="rounded-card bg-card p-6 shadow-float">{children}</div>
      </Reveal>
    </div>
  );
}
