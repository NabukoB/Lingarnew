import { LogOut, ShieldCheck } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button } from "@/components/ui/button";
import { adminLogout } from "@/lib/admin-actions";
import { getAdmin } from "@/lib/admin-api";

export const metadata = { title: "Admin · Mtandao", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  const me = await getAdmin();
  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col gap-5 px-4 pb-16 pt-4 lg:px-8 lg:pt-6">
      <header className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
          <ShieldCheck aria-hidden size={20} strokeWidth={2.4} />
        </span>
        <span className="mr-2 text-lg font-extrabold tracking-tight">Admin</span>
        <AdminNav />
        <span className="ml-auto hidden truncate text-sm font-semibold text-muted-foreground sm:block">{me.email}</span>
        <form action={adminLogout}>
          <Button type="submit" variant="secondary" size="icon" aria-label="Sign out">
            <LogOut aria-hidden size={18} />
          </Button>
        </form>
      </header>
      {children}
    </div>
  );
}
