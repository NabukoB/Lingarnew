import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-start justify-center px-4 py-10 sm:items-center">
      <div className="flex w-full max-w-[420px] flex-col gap-6">
        <Logo />
        <div className="rounded-card bg-white p-6 shadow-card">{children}</div>
      </div>
    </div>
  );
}
