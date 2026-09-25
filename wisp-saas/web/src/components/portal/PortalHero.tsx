import { Phone, Wifi } from "lucide-react";
import type { Tenant } from "@/lib/types";

export function PortalHero({ tenant }: { tenant: Tenant }) {
  return (
    <header className="relative overflow-hidden px-5 pb-[52px] pt-6 text-white" style={{ background: "var(--accent)" }}>
      <Wifi aria-hidden size={260} strokeWidth={0.8} className="absolute -right-[70px] -top-10 opacity-[0.12]" />
      <div className="relative flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white text-[22px] font-extrabold" style={{ color: "var(--accent)" }}>
          {tenant.name[0]}
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-[21px] font-extrabold tracking-tight">{tenant.name}</span>
          <span className="flex items-center gap-1.5 text-xs opacity-90">
            <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-green-400" />
            {tenant.location}
          </span>
        </div>
        <a
          href={`tel:${tenant.supportPhone.replace(/\s/g, "")}`}
          aria-label={`Call support ${tenant.supportPhone}`}
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/15"
        >
          <Phone aria-hidden size={19} strokeWidth={2} />
        </a>
      </div>
    </header>
  );
}

export function PortalSheet({ children }: { children: React.ReactNode }) {
  return <div className="relative -mt-7 flex flex-grow flex-col gap-4 rounded-t-[28px] bg-ground px-4 pt-4">{children}</div>;
}
