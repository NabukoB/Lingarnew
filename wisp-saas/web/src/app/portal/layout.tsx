import { getTenant } from "@/lib/api";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenant();
  return (
    <div className="flex min-h-screen justify-center bg-ground" style={{ ["--accent" as string]: tenant.accent }}>
      <div className="flex min-h-screen w-full max-w-[430px] flex-col">{children}</div>
    </div>
  );
}
