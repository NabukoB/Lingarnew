import { WifiOff } from "lucide-react";
import { getPortalTenant, PortalNotFound } from "@/lib/portal";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  let accent = "#2563eb";
  let body = children;
  try {
    accent = (await getPortalTenant()).accent;
  } catch (e) {
    if (!(e instanceof PortalNotFound)) throw e;
    body = (
      <main className="flex flex-grow flex-col items-center justify-center gap-3 px-6 text-center">
        <WifiOff aria-hidden size={40} className="text-slate-400" />
        <h1 className="text-xl font-extrabold">Wi-Fi not found</h1>
        <span className="text-sm font-semibold text-slate-500">Reconnect to the network and try again</span>
      </main>
    );
  }
  return (
    <div className="flex min-h-screen justify-center bg-ground" style={{ ["--accent" as string]: accent }}>
      <div className="flex min-h-screen w-full max-w-[430px] flex-col">{body}</div>
    </div>
  );
}
