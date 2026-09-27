import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { SettingsTabs } from "@/components/settings/common";
import { getSettings } from "@/lib/api";

export const metadata = { title: "Settings · Mtandao" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: { welcome?: string } }) {
  const tenant = await getSettings();
  return (
    <>
      <SettingsTabs />
      {searchParams.welcome === "1" && (
        <ol className="grid grid-cols-2 gap-2 rounded-card bg-blue-600 p-4 text-[13px] font-bold text-white shadow-brand sm:grid-cols-4">
          {["Till / Paybill", "Support phone", "Packages", "Add router"].map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      )}
      {tenant ? <GeneralSettings tenant={tenant} /> : <p className="py-12 text-center text-sm font-semibold text-slate-500">Connect the API to edit settings</p>}
    </>
  );
}
