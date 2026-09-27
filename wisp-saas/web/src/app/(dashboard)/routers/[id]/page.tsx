import { ArrowLeft, Check, X } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConnectRouter } from "@/components/routers/ConnectRouter";
import { RouterActions } from "@/components/routers/RouterActions";
import { RouterStatusPill } from "@/components/bits";
import { getChecklist, getLocations, getRouter } from "@/lib/api";
import { ApiError } from "@/lib/backend";
import { longDate, routerStatus } from "@/lib/mappers";
import { newSetupCommand } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function RouterPage({ params, searchParams }: { params: { id: string }; searchParams: { setup?: string } }) {
  let r;
  try {
    r = await getRouter(params.id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  if (!r) notFound();

  if (!r.connected || searchParams.setup === "1") {
    const setup = await newSetupCommand(r.id);
    return <ConnectRouter locations={await getLocations()} existing={{ id: r.id, name: r.name, setup: setup.ok ? setup.data : undefined }} />;
  }

  const status = routerStatus(r.status);
  const items = status === "offline" ? [] : await getChecklist(r.id).catch(() => []);
  const facts: [string, string][] = [
    ["Board", r.board_name ?? "—"],
    ["RouterOS", r.firmware_version ?? "—"],
    ["Tunnel", r.tunnel_ip],
    ["Seen", r.last_seen_at ? longDate(r.last_seen_at)! : "—"],
    ["Hotspot", r.hotspot_ports.join(", ") || "—"],
    ["PPPoE", r.pppoe_ports.join(", ") || "—"],
  ];
  return (
    <>
      <header className="flex flex-wrap items-center gap-3.5">
        <Button asChild variant="secondary" size="icon" aria-label="Back">
          <Link href="/network">
            <ArrowLeft aria-hidden size={20} strokeWidth={2.2} />
          </Link>
        </Button>
        <h1 className="text-2xl font-extrabold tracking-tight">{r.name}</h1>
        <RouterStatusPill status={status} />
      </header>
      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
        <Card className="flex flex-col gap-4 p-5">
          <dl className="grid grid-cols-2 gap-2.5">
            {facts.map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-muted/60 px-3 py-2.5">
                <dt className="text-[11px] text-muted-foreground">{k}</dt>
                <dd className="mt-0.5 truncate text-sm font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          <RouterActions id={r.id} name={r.name} />
        </Card>
        {items.length > 0 && (
          <Card aria-label="Checklist" className="px-5 py-2">
            <Stagger as="ul">
              {items.map((c, i) => (
                <StaggerItem as="li" key={c.key} className={`flex items-center gap-3 py-2.5 ${i ? "border-t border-line" : ""}`}>
                  <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full ${c.ok ? "bg-green-100" : "bg-amber-100"}`}>
                    {c.ok ? <Check aria-hidden size={12} strokeWidth={3.4} className="text-green-700" /> : <X aria-hidden size={12} strokeWidth={3.4} className="text-amber-700" />}
                  </span>
                  <span className="flex-grow text-sm font-semibold">{c.label}</span>
                  {!c.ok && c.hint && <span className="text-right text-xs font-semibold text-amber-700">{c.hint}</span>}
                </StaggerItem>
              ))}
            </Stagger>
          </Card>
        )}
      </div>
    </>
  );
}
