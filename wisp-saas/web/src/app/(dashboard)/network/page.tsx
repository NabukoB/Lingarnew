import { Plus, Router } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader, RouterStatusDot, RouterStatusPill } from "@/components/bits";
import { FindBar } from "@/components/FindBar";
import { Stagger, StaggerItem } from "@/components/motion";
import { RoutersRing } from "@/components/NetworkCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getRouters } from "@/lib/api";

export const metadata = { title: "Network · Mtandao" };
export const dynamic = "force-dynamic";

export default async function NetworkPage() {
  const routers = await getRouters();
  const online = routers.filter((r) => r.status === "online" || r.status === "slow").length;
  const offline = routers.filter((r) => r.status === "offline").length;
  const users = routers.reduce((n, r) => n + (r.users ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Network"
        actions={
          <Button asChild size="pill">
            <Link href="/routers/new">
              <Plus aria-hidden size={16} strokeWidth={2.6} />
              Add router
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-5">
        <div className="flex flex-col gap-4">
          <Card aria-label="Routers online" className="flex items-center gap-5 px-5 py-4">
            <RoutersRing online={online} total={routers.length} size={96} />
            <div className="flex flex-col gap-2 text-sm font-bold">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
                {online} online
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                {offline} offline
              </span>
              <span className="text-muted-foreground">{users} users</span>
            </div>
          </Card>
          <FindBar placeholder="Find a router" />
        </div>

        <Card aria-label="Routers" className="px-3 py-1 lg:px-5">
          {routers.length === 0 ? (
            <EmptyState
              icon={Router}
              title="No routers yet"
              action={
                <Button asChild size="sm">
                  <Link href="/routers/new">Add router</Link>
                </Button>
              }
            />
          ) : (
            <Stagger as="ul">
              {routers.map((r, i) => (
                <StaggerItem as="li" key={r.id} className={i ? "border-t border-line" : ""}>
                  <Link href={`/routers/${r.id}`} className="group flex items-center gap-3 rounded-2xl px-2 py-3.5 transition-colors hover:bg-muted/60">
                    <RouterStatusDot status={r.status} />
                    <div className="flex min-w-0 flex-grow flex-col">
                      <span className="truncate text-sm font-bold group-hover:text-primary">{r.name}</span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {r.status === "offline" && r.offlineMinutes ? `Offline ${r.offlineMinutes}m` : r.location}
                      </span>
                    </div>
                    <span className="tabular text-xs font-semibold text-muted-foreground">{r.users ?? "—"}</span>
                    <RouterStatusPill status={r.status} />
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </Card>
      </div>
    </>
  );
}
